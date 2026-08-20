/* ============================================================
   OKL Hospital — APP LOGIC (app.js)
   Уся взаємодія UI. Дані беруться з DB (store.js).
   ============================================================ */

/* ---------- Права доступу за ролями ----------
   Хто що може РЕДАГУВАТИ у кожному розділі.
   Змініть значення true/false, щоб налаштувати доступ. */
const PERMISSIONS = {
  admin:  { patients:true,  operations:true,  journal:true,  report:true,  settings:true  },
  doctor: { patients:true,  operations:true,  journal:true,  report:true,  settings:false },
  viewer: { patients:false, operations:false, journal:false, report:false, settings:false },
};
let currentUser = null;
function can(section){ return !!(currentUser && PERMISSIONS[currentUser.role] && PERMISSIONS[currentUser.role][section]); }
function needRights(section){ if(can(section))return true; toast('warning','Недостатньо прав для цієї дії'); return false; }
function applyPermissions(){
  const addBtn=document.querySelector("#view-patients .page-actions .btn-primary");
  if(addBtn)addBtn.style.display=can('patients')?'':'none';
  document.querySelectorAll('[data-view="settings"]').forEach(el=>el.style.display=can('settings')?'':'none');
}

/* ---------- Довідники ---------- */
const catColor = {'ЗСУ':'blue','НГУ':'green','ДПСУ':'purple','СБУ':'teal','ДСНС':'orange','Поліція':'gray','Інші':'gray',
  'Амбулаторно':'teal','Ургентно':'red','Планово':'blue','Вибухові':'orange'};
const civCats = ['Амбулаторно','Ургентно','Планово','Вибухові'];
const stateColor = {'Легкий':'green','Стабільний':'green','Середній':'orange','Важкий':'red','Вкрай важкий':'red'};
const statColorHex = {blue:'#3B82F6',green:'#10B981',purple:'#8B5CF6',teal:'#0796B1',orange:'#F59E0B',red:'#EF4444',gray:'#94A3B8'};
const dischTypes = ['Виписаний додому','Відпустка','До частини','Евакуйований','Санаторне лікування','Порушення режиму','Помер'];

const jDepts = ['Реабілітація','Неврологія 1','Неврологія 2','Інсультне','Кардіологія','Гастроентерологія','Ревматологія','Ендокринологія','ПАВ','Шкірно-венерологічне','Токсикологія','ВЕНМД','Нейрохірургія','Серцево-судинна хір.','Хірургія','Травматологія','Ортопедія','ВХГШ','Офтальмологія','ВІТ','ВПВ','ВСП','ВІТ дорослий','ВІТ дитячий','ВН','ВПН','Гінекологія'];
const jTotals = [['Всього по РПЦ','rpc'],['Всього по ОКЛ','okl']];
// Відділення, що входять до підсумку РПЦ (регіональний перинатальний центр).
// За потреби додайте назви точно як у jDepts.
const rpcDepts = ['Гінекологія'];
const jDeptMap = {'Неврологія':'Неврологія 1'};
const bedsDepts = [['Хірургія',28],['Травматологія',19],['Неврологія',15],['Кардіологія',14],['Терапія',12],['Інтенсивна терапія',6],['Педіатрія',8],['Психіатрія',6],['Інфекційне відділення',4]];
const deptIcons = {'Хірургія':'✚','Травматологія':'🦴','Неврологія':'🧠','Неврологія 1':'🧠','Кардіологія':'❤','Терапія':'🩺','Інтенсивна терапія':'🚨','Педіатрія':'🧸','Психіатрія':'🧩','Інфекційне':'🦠'};

const opsRowsSeed = [['Хірургія',18,20,8,'A',10,'B',2,'C'],['Травматологія',15,17,7,'A',9,'B',1,'C'],['Неврологія',8,9,4,'A',5,'B',0,'—'],['Кардіологія',9,11,5,'B',6,'B',0,'—'],['Судинна хірургія',6,7,4,'A',3,'B',0,'—'],['Офтальмологія',7,7,1,'A',6,'B',0,'—'],['ЛОР',5,5,0,'—',5,'B',0,'—'],['Урологія',3,3,1,'A',2,'B',0,'—']];
const repRowsMil = [['Хірургія',92,60,32,6,28,4,20,6,3],['Травматологія',81,54,27,5,19,3,16,4,2],['Неврологія',67,42,25,3,15,2,13,3,1],['Кардіологія',58,36,22,4,14,3,9,2,2],['Терапія',44,28,16,2,12,1,7,2,1],['Інтенсивна терапія',38,30,8,3,6,0,5,1,0],['Педіатрія',24,16,8,1,8,3,3,0,0],['Психіатрія',16,10,6,1,6,0,2,1,0],['Інфекційне',12,8,4,2,4,2,2,1,1]];
const repRowsAll = [['Хірургія',118,74,44,8,36,5,26,7,4],['Травматологія',96,63,33,6,24,4,19,5,2],['Неврологія',88,55,33,4,21,3,17,4,1],['Кардіологія',102,61,41,7,28,5,15,3,3],['Терапія',77,46,31,4,22,2,13,3,1],['Інтенсивна терапія',44,34,10,3,7,0,6,1,0],['Педіатрія',31,20,11,1,11,4,4,0,0],['Психіатрія',22,13,9,1,8,0,3,1,0],['Інфекційне',26,15,11,3,9,3,4,1,1]];
let repScope = 'mil';

/* ---------- Helpers ---------- */
function initials(name){const pr=name.trim().split(/\s+/);return ((pr[0]||'')[0]+((pr[1]||'')[0]||'')).toUpperCase();}
function daysSince(iso){if(!iso)return 0;const d=new Date(iso+'T00:00:00');const now=new Date();return Math.max(0,Math.floor((now-d)/86400000));}
function fmtDDMM(iso){if(!iso)return '—';const p=iso.split('-');return p[2]+'.'+p[1];}
function todayISO(){return new Date().toISOString().slice(0,10);}
function esc(s){return (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function sparkPath(color){const pts=Array.from({length:12},()=>20+Math.random()*14);const w=140,h=34,step=w/(pts.length-1);let d='M0 '+(h-pts[0]);pts.forEach((p,i)=>{if(i)d+=' L'+(i*step).toFixed(0)+' '+(h-p).toFixed(0);});const c=statColorHex[color]||'#10B981';return '<svg class="spark" viewBox="0 0 140 34" preserveAspectRatio="none"><path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
function kpiCard(k){let extra='';if(k.meter!=null)extra='<div class="barmeter"><i style="width:'+k.meter+'%"></i></div>';else if(k.spark)extra=sparkPath(k.spark);let delta='';if(k.delta){const a=k.delta==='up'?'▲':k.delta==='down'?'▼':'•';delta='<div class="delta '+k.delta+'">'+a+' '+k.dtxt+'</div>';}else if(k.dtxt)delta='<div class="delta neu">'+k.dtxt+'</div>';return '<div class="kpi"><div class="top"><div class="ic '+k.ic+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none">'+(k.svg||'')+'</svg></div><div class="lbl">'+k.lbl+'</div></div><div class="val">'+k.val+'</div>'+delta+extra+'</div>';}

/* ============================================================
   ПАЦІЄНТИ  (список, фільтри, пагінація, KPI)
   ============================================================ */
let ptPage = 1;
const PT_PAGE_SIZE = 20;

function computeKpis(){
  const all = DB.patients();
  const active = all.filter(p=>p.status==='active');
  const t = todayISO();
  return {
    active: active.length,
    lt15: active.filter(p=>daysSince(p.hospISO)<15).length,
    gt15: active.filter(p=>daysSince(p.hospISO)>15).length,
    dischargedToday: all.filter(p=>p.status==='discharged'&&p.dischargeISO===t).length,
    cert: active.filter(p=>p.cert).length,
  };
}
function renderPatientKpis(){
  const k = computeKpis();
  const cards = [
    {ic:'teal',lbl:'На лікуванні',val:k.active,delta:'up',dtxt:'активні пацієнти',spark:'green',svg:'<circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3 2.7-4.5 6-4.5S15 17 15 20" stroke="currentColor" stroke-width="1.6"/>'},
    {ic:'green',lbl:'Ліжко-днів < 15',val:k.lt15,delta:'up',dtxt:'до 15 днів',spark:'green',svg:'<rect x="3" y="10" width="18" height="9" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 14h18M7 10V7h5v3" stroke="currentColor" stroke-width="1.6"/>'},
    {ic:'red',lbl:'Ліжко-днів > 15',val:k.gt15,delta:'neu',dtxt:'понад 15 днів',spark:'red',svg:'<circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3 20c0-3 2.7-4.5 6-4.5S15 17 15 20" stroke="currentColor" stroke-width="1.6"/>'},
    {ic:'blue',lbl:'Виписано сьогодні',val:k.dischargedToday,delta:'up',dtxt:'за сьогодні',spark:'blue',svg:'<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'},
    {ic:'purple',lbl:'Свідоцтв',val:k.cert,delta:'neu',dtxt:'оформлено',spark:'purple',svg:'<rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6M9 12h6" stroke="currentColor" stroke-width="1.6"/>'},
  ];
  document.getElementById('kpiPatients').innerHTML = cards.map(kpiCard).join('');
}

function filteredPatients(){
  const q=(document.getElementById('ptSearch').value||'').toLowerCase();
  const cat=document.getElementById('fCat').value, dept=document.getElementById('fDept').value, st=document.getElementById('fState').value;
  return DB.patients().filter(p=>p.status==='active').filter(p=>{
    const t=(p.name+' '+p.diag+' '+p.dept).toLowerCase();
    return t.includes(q)&&(!cat||p.cat===cat)&&(!dept||p.dept===dept)&&(!st||p.triage===st);
  });
}
function renderPatients(){
  renderPatientKpis();
  const list=filteredPatients();
  const totalActive=DB.patients().filter(p=>p.status==='active').length;
  const body=document.getElementById('ptBody'), cards=document.getElementById('ptCards');
  const pages=Math.max(1,Math.ceil(list.length/PT_PAGE_SIZE));
  if(ptPage>pages)ptPage=pages;
  const start=(ptPage-1)*PT_PAGE_SIZE;
  const pageItems=list.slice(start,start+PT_PAGE_SIZE);

  if(!list.length){
    const empty='<div class="empty"><div class="ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.6"/><path d="M20 20l-3-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div><h3>Пацієнтів не знайдено</h3><p>Спробуйте змінити параметри пошуку або додайте нового пацієнта.</p></div>';
    body.innerHTML='<tr><td colspan="11">'+empty+'</td></tr>';
    cards.innerHTML=empty;
    document.getElementById('ptInfo').textContent='Показано 0 із '+totalActive;
    renderPager(0);return;
  }
  body.innerHTML=pageItems.map(p=>{
    const sc=stateColor[p.triage]||'gray';
    return `<tr>
      <td><div class="pt-name"><div class="av">${initials(p.name)}</div><div><div class="nm">${esc(p.name)}</div><div class="id">№ ${p.idno}${p.age?' · '+p.age+' р.':''}</div></div></div></td>
      <td>${esc(p.dept)}</td>
      <td><div class="diag">${esc(p.diag)}</div></td>
      <td><span class="chip ${catColor[p.cat]||'gray'}">${esc(p.cat)}</span></td>
      <td>${fmtDDMM(p.hospISO)}</td>
      <td style="font-weight:600">${daysSince(p.hospISO)}</td>
      <td><span class="chip ${sc}"><span class="dot"></span>${esc(p.triage)}</span></td>
      <td style="color:var(--color-text-secondary)">${esc(p.evac)||'—'}</td>
      <td>${p.cert?'<span class="chip teal">Так</span>':'<span style="color:var(--color-text-tertiary)">—</span>'}</td>
      <td>${p.pow?'<span class="chip orange">Так</span>':'<span style="color:var(--color-text-tertiary)">—</span>'}</td>
      <td><div class="row-actions">
        <button title="Переглянути" onclick="viewPatient('${p.id}')"><svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg></button>
        <button title="Редагувати" onclick="editPatient('${p.id}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9l-4-4L4 16z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></button>
        <button title="Ще" onclick="openRowMenu('${p.id}',event)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg></button>
      </div></td>
    </tr>`;}).join('');
  cards.innerHTML=pageItems.map(p=>{
    const sc=stateColor[p.triage]||'gray';
    return `<div class="pt-card">
      <div class="top"><div class="av" style="width:40px;height:40px;border-radius:50%;background:var(--color-surface-2);color:var(--color-text-secondary);display:grid;place-items:center;font-weight:700;font-size:13px">${initials(p.name)}</div>
      <div style="flex:1"><div style="font-weight:700">${esc(p.name.split(' ').slice(0,2).join(' '))}</div><div style="font-size:12px;color:var(--color-text-secondary)">№ ${p.idno}${p.age?' · '+p.age+' р.':''}</div></div>
      <button class="icon-btn bare" onclick="openRowMenu('${p.id}',event)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg></button></div>
      <div class="meta"><span>${esc(p.dept)}</span><span class="d"></span><span>${daysSince(p.hospISO)} днів</span><span class="d"></span><span class="chip ${catColor[p.cat]||'gray'}" style="height:20px">${esc(p.cat)}</span><span class="chip ${sc}" style="height:20px"><span class="dot"></span>${esc(p.triage)}</span></div>
    </div>`;}).join('');
  document.getElementById('ptInfo').textContent='Показано '+(start+1)+'–'+(start+pageItems.length)+' із '+totalActive;
  renderPager(pages);
}
function renderPager(pages){
  const box=document.getElementById('ptPager');if(!box)return;
  if(pages<=1){box.innerHTML='';return;}
  let html='<button onclick="gotoPage('+(ptPage-1)+')" '+(ptPage===1?'disabled':'')+'>←</button>';
  for(let i=1;i<=pages;i++){
    if(i===1||i===pages||Math.abs(i-ptPage)<=1){html+='<button class="'+(i===ptPage?'active':'')+'" onclick="gotoPage('+i+')">'+i+'</button>';}
    else if(i===2&&ptPage>3){html+='<span class="dots">…</span>';}
    else if(i===pages-1&&ptPage<pages-2){html+='<span class="dots">…</span>';}
  }
  html+='<button onclick="gotoPage('+(ptPage+1)+')" '+(ptPage===pages?'disabled':'')+'>→</button>';
  box.innerHTML=html;
}
function gotoPage(n){ptPage=Math.max(1,n);renderPatients();}

/* ---------- Меню дій у рядку ---------- */
function openRowMenu(id,ev){
  ev.stopPropagation();closeRowMenu();
  const p=DB.getPatient(id);if(!p)return;
  const m=document.createElement('div');m.className='row-menu';m.id='rowMenu';
  m.innerHTML=`
    <button onclick="viewPatient('${id}');closeRowMenu()"><svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg> Переглянути</button>
    <button onclick="editPatient('${id}');closeRowMenu()"><svg viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19 9l-4-4L4 16z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg> Редагувати</button>
    <button onclick="openDischarge('${id}');closeRowMenu()"><svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> Виписати</button>
    <div class="sep"></div>
    <button class="danger" onclick="deletePatient('${id}');closeRowMenu()"><svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg> Видалити</button>`;
  document.body.appendChild(m);
  const r=ev.currentTarget.getBoundingClientRect();
  let left=r.right-190, top=r.bottom+6;
  if(top+180>window.innerHeight)top=r.top-186;
  m.style.left=Math.max(8,left)+'px';m.style.top=top+'px';
}
function closeRowMenu(){const m=document.getElementById('rowMenu');if(m)m.remove();}
document.addEventListener('click',e=>{if(!e.target.closest('#rowMenu')&&!e.target.closest('.row-actions')&&!e.target.closest('.pt-card .icon-btn'))closeRowMenu();});

/* ---------- Перегляд картки ---------- */
function viewPatient(id){
  const p=DB.getPatient(id);if(!p)return;
  document.getElementById('viewSub').textContent='№ '+p.idno+(p.age?' · '+p.age+' р.':'');
  const rows=[
    ['ПІБ',p.name],['Тип',p.type==='civ'?'Цивільний':'Військовий'],['Категорія',p.cat],
    ['Відділення',p.dept],['Діагноз',p.diag],['Тріаж / Стан',p.triage],
    ['Дата госпіталізації',fmtDDMM(p.hospISO)],['Ліжко-дні',daysSince(p.hospISO)],
    ['Евакуаційна категорія',p.evac||'—'],['Свідоцтво',p.cert?'Так':'Ні'],['З полону',p.pow?'Так':'Ні'],
  ];
  document.getElementById('viewRows').innerHTML=rows.map(r=>`<div class="vrow"><span class="vk">${r[0]}</span><span class="vv">${esc(String(r[1]))}</span></div>`).join('');
  document.getElementById('viewEditBtn').onclick=()=>{closeModal('m-view');editPatient(id);};
  openModal('m-view');
}

/* ---------- Додавання ---------- */
let addType='mil';
function setPtType(type){
  addType=type;
  document.querySelectorAll('#ptType button').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
  const mil=type==='mil';
  document.getElementById('catMil').style.display=mil?'':'none';
  document.getElementById('catCiv').style.display=mil?'none':'';
  document.querySelectorAll('#m-add .milOnly').forEach(f=>f.style.display=mil?'':'none');
}
function resetAddForm(){
  setPtType('mil');
  ['addName','addDiag'].forEach(id=>document.getElementById(id).value='');
  ['addCatMil','addCatCiv','addTriage','addDept','addInjury','addEvac'].forEach(id=>document.getElementById(id).selectedIndex=0);
  document.getElementById('addDate').value=todayISO();
  document.getElementById('addCert').checked=false;document.getElementById('addPow').checked=false;
}
function savePatient(){
  if(!needRights('patients'))return;
  const name=document.getElementById('addName').value.trim();
  const cat=(addType==='mil'?document.getElementById('addCatMil'):document.getElementById('addCatCiv')).value;
  const triage=document.getElementById('addTriage').value;
  const dept=document.getElementById('addDept').value;
  if(!name){toast('error','Вкажіть ПІБ пацієнта');return;}
  if(!cat){toast('error','Оберіть категорію');return;}
  if(!triage){toast('error','Оберіть тріаж');return;}
  if(!dept){toast('error','Оберіть відділення');return;}
  DB.addPatient({
    type:addType,name,age:null,dept,
    diag:document.getElementById('addDiag').value.trim()||'—',
    cat,hospISO:document.getElementById('addDate').value||todayISO(),
    triage,evac:document.getElementById('addEvac').value||'',
    cert:addType==='mil'&&document.getElementById('addCert').checked,
    pow:addType==='mil'&&document.getElementById('addPow').checked,
    status:'active',dischargeType:'',dischargeISO:'',deathTime:'',note:'',
  });
  closeModal('m-add');
  ptPage=1;refreshData();
  toast('success','Пацієнта «'+name.split(' ')[0]+'» додано до реєстру');
}

/* ---------- Редагування ---------- */
function editPatient(id){
  if(!needRights('patients')){toast('warning','Недостатньо прав для редагування');return;}
  const p=DB.getPatient(id);if(!p)return;
  document.getElementById('editId').value=id;
  document.getElementById('editName').value=p.name;
  setSelect('editCat',p.cat);setSelect('editTriage',p.triage);setSelect('editDept',p.dept);
  document.getElementById('editDate').value=p.hospISO;
  document.getElementById('editDiag').value=p.diag;
  setSelect('editEvac',p.evac);
  document.getElementById('editCert').checked=!!p.cert;
  document.getElementById('editCertField').style.display=(p.type==='civ')?'none':'';
  openModal('m-edit');
}
function setSelect(id,val){const s=document.getElementById(id);if(!s)return;const i=[...s.options].findIndex(o=>o.value===val||o.text===val);s.selectedIndex=i>=0?i:0;}
function saveEdit(){
  if(!needRights('patients'))return;
  const id=document.getElementById('editId').value;
  const name=document.getElementById('editName').value.trim();
  if(!name){toast('error','Вкажіть ПІБ пацієнта');return;}
  DB.updatePatient(id,{
    name,cat:document.getElementById('editCat').value,triage:document.getElementById('editTriage').value,
    dept:document.getElementById('editDept').value,hospISO:document.getElementById('editDate').value,
    diag:document.getElementById('editDiag').value.trim()||'—',evac:document.getElementById('editEvac').value,
    cert:document.getElementById('editCert').checked,
  });
  closeModal('m-edit');refreshData();toast('success','Зміни збережено');
}

/* ---------- Виписка ---------- */
let dischargePick='Виписаний додому';
function openDischarge(id){
  if(!needRights('patients'))return;
  const p=DB.getPatient(id);if(!p)return;
  document.getElementById('dischargeId').value=id;
  document.getElementById('dischargeName').textContent=p.name;
  document.querySelectorAll('#dischargeCards .select-card').forEach((c,i)=>c.classList.toggle('active',i===0));
  document.getElementById('deathTimeField').style.display='none';
  dischargePick='Виписаний додому';
  openModal('m-discharge');
}
function pickDischarge(el,isDeath){
  document.querySelectorAll('#dischargeCards .select-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  dischargePick=el.textContent.trim();
  document.getElementById('deathTimeField').style.display=isDeath?'':'none';
}
function saveDischarge(){
  const id=document.getElementById('dischargeId').value;
  const isDeath=dischargePick==='Помер';
  DB.updatePatient(id,{status:'discharged',dischargeType:dischargePick,dischargeISO:todayISO(),
    deathTime:isDeath?(document.querySelector('#deathTimeField input').value||''):''});
  closeModal('m-discharge');refreshData();
  toast('success','Виписку оформлено ('+dischargePick+')');
}

/* ---------- Видалення ---------- */
function deletePatient(id){
  if(!needRights('patients'))return;
  const p=DB.getPatient(id);if(!p)return;
  openConfirm('Видалити пацієнта?','«'+p.name+'» буде видалено з реєстру. Дію не можна скасувати.',()=>{
    DB.removePatient(id);refreshData();toast('success','Пацієнта видалено');
  });
}

/* ---------- Confirm dialog ---------- */
let _confirmCb=null;
function openConfirm(title,msg,cb){
  document.getElementById('confirmTitle').textContent=title;
  document.getElementById('confirmMsg').textContent=msg;
  _confirmCb=cb;openModal('m-confirm');
}
document.getElementById('confirmBtn').addEventListener('click',()=>{closeModal('m-confirm');if(_confirmCb)_confirmCb();_confirmCb=null;});

/* ============================================================
   ОПЕРАЦІЇ
   ============================================================ */
function renderOps(){
  const saved=DB.getKV('ops');
  const rows=saved||opsRowsSeed;
  const tb=document.getElementById('opsBody');
  const codeSel=v=>`<select class="cellsel"><option ${v==='A'?'selected':''}>A</option><option ${v==='B'?'selected':''}>B</option><option ${v==='C'?'selected':''}>C</option><option ${v==='—'?'selected':''}>—</option></select>`;
  tb.innerHTML=rows.map((r,ri)=>`
    <tr data-ri="${ri}">
      <td>${r[0]}</td>
      <td><input class="cellinp" value="${r[1]}" oninput="sumOps()"></td>
      <td><input class="cellinp" value="${r[2]}" oninput="sumOps()"></td>
      <td class="grp"><input class="cellinp" value="${r[3]}" oninput="sumOps()"></td><td>${codeSel(r[4])}</td>
      <td class="grp"><input class="cellinp" value="${r[5]}" oninput="sumOps()"></td><td>${codeSel(r[6])}</td>
      <td class="grp"><input class="cellinp" value="${r[7]}" oninput="sumOps()"></td><td>${codeSel(r[8])}</td>
      <td><button class="icon-btn bare" onclick="toast('info','Рядок: ${r[0]}')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg></button></td>
    </tr>`).join('');
  sumOps();
}
function sumOps(){
  const rows=[...document.querySelectorAll('#opsBody tr')];
  const col=i=>rows.reduce((a,tr)=>a+(+tr.querySelectorAll('input')[i]?.value||0),0);
  document.getElementById('opsFoot').innerHTML=`<td>Всього</td><td style="color:var(--color-primary)">${col(0)}</td><td style="color:var(--color-primary)">${col(1)}</td><td class="grp" style="color:var(--color-primary)">${col(2)}</td><td></td><td class="grp" style="color:var(--color-primary)">${col(3)}</td><td></td><td class="grp" style="color:var(--color-primary)">${col(4)}</td><td></td><td></td>`;
}
function saveOps(){
  if(!needRights('operations'))return;
  const rows=[...document.querySelectorAll('#opsBody tr')].map(tr=>{
    const inp=[...tr.querySelectorAll('input')].map(i=>+i.value||0);
    const sel=[...tr.querySelectorAll('select')].map(s=>s.value);
    const name=tr.children[0].textContent;
    return [name,inp[0],inp[1],inp[2],sel[0],inp[3],sel[1],inp[4],sel[2]];
  });
  DB.setKV('ops',rows);toast('success','Дані операцій збережено');
}
const kpiOps=[
  {ic:'teal',lbl:'Прооперовано сьогодні',val:'78',delta:'up',dtxt:'12% до вчора',spark:'teal',svg:'<path d="M14 3l-1 3 4 4 3-1M14 3L3 14l1 6 6 1L21 10" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'},
  {ic:'green',lbl:'Заплановано на сьогодні',val:'86',delta:'up',dtxt:'8% від плану',spark:'green',svg:'<rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.6"/>'},
  {ic:'purple',lbl:'Складні випадки',val:'24',delta:'neu',dtxt:'31% від всіх втручань',spark:'purple',svg:'<rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" stroke-width="1.6"/>'},
  {ic:'orange',lbl:'Ургентні операції',val:'16',delta:'neu',dtxt:'21% від всіх втручань',spark:'orange',svg:'<path d="M12 3v6l4 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.6"/>'},
];
document.getElementById('kpiOps').innerHTML=kpiOps.map(kpiCard).join('');

/* ============================================================
   ЗВІТ 08:00
   ============================================================ */
const kpiReport=[
  {ic:'teal',lbl:'Заповненість ліжок',val:'68%',meter:68,dtxt:'346 з 512 зайнято'},
  {ic:'green',lbl:'На евакуацію',val:'24',delta:'up',dtxt:'8 за добу',spark:'green'},
  {ic:'orange',lbl:'Вільних ліжок',val:'166',delta:'down',dtxt:'12 за добу',spark:'orange'},
  {ic:'purple',lbl:'Всього пацієнтів',val:'370',delta:'up',dtxt:'14 за добу',spark:'purple'},
  {ic:'blue',lbl:'Свідоцтв видано',val:'18',delta:'up',dtxt:'3 за добу',spark:'blue'},
  {ic:'red',lbl:'Повернуто з полону',val:'7',delta:'up',dtxt:'1 за добу',spark:'red'},
];
const kpiReportAll=[
  {ic:'teal',lbl:'Заповненість ліжок',val:'74%',meter:74,dtxt:'421 з 570 зайнято'},
  {ic:'green',lbl:'На евакуацію',val:'31',delta:'up',dtxt:'10 за добу',spark:'green'},
  {ic:'orange',lbl:'Вільних ліжок',val:'149',delta:'down',dtxt:'15 за добу',spark:'orange'},
  {ic:'purple',lbl:'Всього пацієнтів',val:'524',delta:'up',dtxt:'20 за добу',spark:'purple'},
  {ic:'blue',lbl:'Виписано сьогодні',val:'42',delta:'up',dtxt:'6 за добу',spark:'blue'},
  {ic:'red',lbl:'Померло за добу',val:'3',delta:'neu',dtxt:'за 18.08',spark:'red'},
];
function renderReport(){
  const rows=repScope==='all'?repRowsAll:repRowsMil;
  document.getElementById('repHead').innerHTML=`<th>Відділення</th><th>Всього</th><th>Лежачих</th><th>Сидячих</th><th>На евак.</th><th>Вільних ліжок</th><th>&lt;15</th><th>&gt;15</th><th>Свідоцтво</th><th>З полону</th>`;
  document.getElementById('repSecTitle').textContent='Показники по відділеннях — '+(repScope==='all'?'усі пацієнти':'військові');
  document.getElementById('kpiReport').innerHTML=(repScope==='all'?kpiReportAll:kpiReport).map(kpiCard).join('');
  document.getElementById('repBody').innerHTML=rows.map(r=>`<tr><td><span class="dept-ic"><span class="d">${deptIcons[r[0]]||'▪'}</span>${r[0]}</span></td><td style="font-weight:600">${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td style="color:var(--color-primary);font-weight:600">${r[5]}</td><td>${r[6]}</td><td>${r[7]}</td><td>${r[8]}</td><td>${r[9]}</td></tr>`).join('');
  const sum=i=>rows.reduce((a,r)=>a+(+r[i]||0),0);
  document.getElementById('repFoot').innerHTML=`<td>Всього</td><td>${sum(1)}</td><td>${sum(2)}</td><td>${sum(3)}</td><td>${sum(4)}</td><td style="color:var(--color-primary)">${sum(5)}</td><td>${sum(6)}</td><td>${sum(7)}</td><td>${sum(8)}</td><td>${sum(9)}</td>`;
}
function switchReport(scope){repScope=scope;document.querySelectorAll('#reportTabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.scope===scope));renderReport();}

/* ліжка (drawer) */
function renderBeds(){
  const saved=DB.getKV('beds');
  const rows=saved||bedsDepts;
  document.getElementById('bedsRows').innerHTML=rows.map(d=>`<div class="drawer-row"><label>${d[0]}</label><input class="inp numinp" type="number" value="${d[1]}" style="height:40px" oninput="recalcBeds()"></div>`).join('');
  recalcBeds();
}
function recalcBeds(){const total=[...document.querySelectorAll('#bedsRows .numinp')].reduce((a,i)=>a+(+i.value||0),0);document.getElementById('bedsTotal').textContent=total;}
function saveBeds(){
  if(!needRights('report'))return;
  const rows=[...document.querySelectorAll('#bedsRows')].length?bedsDepts.map((d,i)=>[d[0],+document.querySelectorAll('#bedsRows .numinp')[i].value||0]):bedsDepts;
  DB.setKV('beds',rows);closeDrawer();toast('success','Вільні ліжка збережено');
}
function openDrawer(){renderBeds();document.getElementById('bedsDrawer').classList.add('show');document.getElementById('drawerOverlay').classList.add('show');document.body.style.overflow='hidden';}
function closeDrawer(){document.getElementById('bedsDrawer').classList.remove('show');document.getElementById('drawerOverlay').classList.remove('show');document.body.style.overflow='';}

/* ============================================================
   ЖУРНАЛ ЗА ДОБУ (автозаповнення з реєстру)
   ============================================================ */
function jStatsFromPatients(){
  const m={};const t=todayISO();
  DB.patients().forEach(p=>{
    const jd=jDeptMap[p.dept]||p.dept;
    if(!jDepts.includes(jd))return;
    const s=(m[jd]=m[jd]||{present:0,lying:0,mil:0,blast:0,admitted:0,left:0,died:0,perebuvalo:0,vit:0});
    if(p.status==='active'){s.present++;if(p.evac==='Лежачий')s.lying++;if(p.type!=='civ')s.mil++;if(p.cat==='Вибухові')s.blast++;if(p.triage==='Вкрай важкий')s.vit++;}
    if(p.hospISO===t)s.admitted++;
    if(p.status==='discharged'&&p.dischargeISO===t){if(p.dischargeType==='Помер')s.died++;else s.left++;}
  });
  Object.values(m).forEach(s=>{s.perebuvalo=Math.max(0,s.present-s.admitted+s.left+s.died);});
  return m;
}
function jCellVal(v,cls,ro){return `<td><input class="cellinp ${cls}" type="number" min="0"${v!=null?` value="${v}"`:''}${ro?' readonly':''} oninput="jSum()"></td>`;}
function jRow(name,total,d){
  if(total){
    const cells=Array.from({length:9},()=>jCellVal(null,'jtot auto',true)).join('');
    return `<tr data-total="${total}" style="background:var(--color-surface-2)"><td style="font-weight:800;color:var(--color-primary)">${name}</td>${cells}</tr>`;
  }
  const map=d?[d.perebuvalo,d.admitted,d.left,d.died,d.present,d.lying,d.mil,d.blast,d.vit]:new Array(9).fill(0);
  let cells='';for(let i=0;i<9;i++)cells+=jCellVal(map[i],'jc auto',false);
  return `<tr><td>${name}</td>${cells}</tr>`;
}
function renderJournal(){
  const stats=jStatsFromPatients();
  const def={present:0,lying:0,mil:0,blast:0,admitted:0,left:0,died:0,perebuvalo:0,vit:0};
  document.getElementById('jBody').innerHTML=
    jDepts.map(d=>jRow(d,null,stats[d]||def)).join('')+
    jTotals.map(t=>jRow(t[0],t[1],null)).join('');
  document.getElementById('jFoot').innerHTML=`<td>Автосума відділень</td>`+Array.from({length:9},()=>'<td>0</td>').join('');
  jSum();
  fillJournalSummary();
}
function fillJournalSummary(){
  const t=todayISO();
  const admitted=DB.patients().filter(p=>p.hospISO===t);
  const diedToday=DB.patients().filter(p=>p.status==='discharged'&&p.dischargeISO===t&&p.dischargeType==='Помер').length;
  const cnt=(cat)=>admitted.filter(p=>p.cat===cat).length;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  set('sumTotal',admitted.length);
  set('sumUrgent',cnt('Ургентно'));
  set('sumPlan',cnt('Планово'));
  set('sumDied',diedToday);
  set('sumAmb',cnt('Амбулаторно'));
  set('sumBlast',cnt('Вибухові'));
  set('sumMil',admitted.filter(p=>p.type!=='civ').length);
  set('sumCiv',admitted.filter(p=>p.type==='civ').length);
}
function jSum(){
  const foot=document.getElementById('jFoot');
  const deptRows=[...document.querySelectorAll('#jBody tr')].filter(tr=>tr.querySelector('.jc'));
  const rpcSet=new Set(rpcDepts);
  const oklRow=document.querySelector('#jBody tr[data-total="okl"]');
  const rpcRow=document.querySelector('#jBody tr[data-total="rpc"]');
  for(let c=0;c<9;c++){
    let all=0,rpc=0;
    deptRows.forEach(tr=>{const v=+tr.querySelectorAll('.jc')[c].value||0;all+=v;if(rpcSet.has(tr.children[0].textContent))rpc+=v;});
    foot.children[c+1].textContent=all;foot.children[c+1].style.color='var(--color-primary)';
    if(oklRow)oklRow.querySelectorAll('.jtot')[c].value=all;
    if(rpcRow)rpcRow.querySelectorAll('.jtot')[c].value=rpc;
  }
}
function jClear(){document.querySelectorAll('#view-journal input, #view-journal textarea').forEach(i=>{if(i.type!=='date')i.value='';});renderJournal();toast('info','Поля очищено (автозаповнення відновлено)');}
function saveJournal(){if(!needRights('journal'))return;toast('success','Журнал за добу збережено');}

/* ============================================================
   СТАТИСТИКА (з реальних даних)
   ============================================================ */
function renderStats(){
  const dept=document.getElementById('stDept').value, status=document.getElementById('stStatus').value;
  let base=DB.patients();
  if(dept)base=base.filter(p=>p.dept===dept);
  const active=base.filter(p=>p.status==='active');
  const discharged=base.filter(p=>p.status==='discharged');

  // KPI
  const milSum=active.filter(p=>p.type!=='civ').length, civSum=active.filter(p=>p.type==='civ').length, tot=active.length;
  const milPct=tot?milSum/tot*100:0, civPct=tot?100-milPct:0;
  document.getElementById('kpiStats').innerHTML=[
    {ic:'teal',lbl:'Всього пацієнтів',val:tot,dtxt:'на лікуванні'},
    {ic:'blue',lbl:'Військові',val:milSum,dtxt:milPct.toFixed(0)+'% від усіх'},
    {ic:'purple',lbl:'Цивільні',val:civSum,dtxt:civPct.toFixed(0)+'% від усіх'},
    {ic:'green',lbl:'Виписано (всього)',val:discharged.length,dtxt:'за весь період'},
  ].map(kpiCard).join('');

  // Категорії
  const counts={};active.forEach(p=>counts[p.cat]=(counts[p.cat]||0)+1);
  const data=Object.keys(counts).map(c=>({c,v:counts[c],color:catColor[c]||'gray'})).sort((a,b)=>b.v-a.v);
  const max=Math.max(1,...data.map(d=>d.v));const catSum=data.reduce((a,d)=>a+d.v,0);
  document.getElementById('catTotal').textContent='Всього: '+catSum;
  document.getElementById('catBars').innerHTML=data.length?data.map(d=>`<div class="bar-row"><div class="bar-lbl"><span class="chip ${d.color}" style="height:20px">${d.c}</span></div><div class="bar-track"><i style="width:${(d.v/max*100).toFixed(0)}%;background:${statColorHex[d.color]}"></i></div><div class="bar-val">${d.v} <small>${(d.v/catSum*100).toFixed(0)}%</small></div></div>`).join(''):'<div class="empty" style="padding:20px"><p>Немає даних.</p></div>';

  // Donut
  const don=document.getElementById('mcDonut');
  if(tot){don.innerHTML=`<circle cx="21" cy="21" r="15.9" fill="none" stroke="#E2E8F0" stroke-width="6"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#0796B1" stroke-width="6" stroke-dasharray="${milPct} ${100-milPct}" stroke-dashoffset="25" stroke-linecap="round"/><circle cx="21" cy="21" r="15.9" fill="none" stroke="#3B82F6" stroke-width="6" stroke-dasharray="${civPct} ${100-civPct}" stroke-dashoffset="${25-milPct}" stroke-linecap="round"/><text x="21" y="20" text-anchor="middle" font-size="7" font-weight="800" fill="#0F172A">${tot}</text><text x="21" y="26" text-anchor="middle" font-size="3.4" fill="#64748B">пацієнтів</text>`;}
  else don.innerHTML=`<circle cx="21" cy="21" r="15.9" fill="none" stroke="#E2E8F0" stroke-width="6"/>`;
  document.getElementById('mcLegend').innerHTML=`<div class="li"><span class="sw" style="background:#0796B1"></span> Військові <b>${milSum} · ${milPct.toFixed(0)}%</b></div><div class="li"><span class="sw" style="background:#3B82F6"></span> Цивільні <b>${civSum} · ${civPct.toFixed(0)}%</b></div>`;

  // Виписки (реальні)
  const dc={};dischTypes.forEach(t=>dc[t]=0);discharged.forEach(p=>{if(dc[p.dischargeType]!=null)dc[p.dischargeType]++;});
  const dColor={'Виписаний додому':'green','До частини':'teal','Евакуйований':'blue','Відпустка':'purple','Санаторне лікування':'orange','Порушення режиму':'gray','Помер':'red'};
  let dlist=dischTypes.map(t=>[t,dc[t],dColor[t]]).filter(x=>x[1]>0);
  if(status==='На лікуванні')dlist=[];
  const dmax=Math.max(1,...dlist.map(d=>d[1]));
  document.getElementById('dischargeBars').innerHTML=dlist.length?dlist.map(d=>`<div class="bar-row"><div class="bar-lbl">${d[0]}</div><div class="bar-track"><i style="width:${(d[1]/dmax*100).toFixed(0)}%;background:${statColorHex[d[2]]}"></i></div><div class="bar-val">${d[1]}</div></div>`).join(''):'<div class="empty" style="padding:24px"><p>Ще немає виписок. Випишіть пацієнта у розділі «Пацієнти», і статистика оновиться.</p></div>';
}

/* ============================================================
   НАВІГАЦІЯ / СЕРВІС
   ============================================================ */
function refreshData(){renderPatients();renderStats();renderJournal();}

const notifs=[
  {ic:'teal',t:'Новий пацієнт доданий',d:'Ткаченко О. П. · Кардіологія · щойно'},
  {ic:'red',t:'Критичний стан пацієнта',d:'Коваленко А. М. · Травматологія · 12 хв тому'},
  {ic:'orange',t:'Звіт 08:00 ще не заповнено',d:'Нагадування · сьогодні, 08:15'},
];
function renderNotifs(){document.getElementById('notifList').innerHTML=notifs.map(n=>`<div class="notif-item"><div class="ni ${n.ic}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div><div><div class="nt">${n.t}</div><div class="nd">${n.d}</div></div></div>`).join('');}
function toggleNotif(e){e.stopPropagation();document.getElementById('notifPanel').classList.toggle('show');}
function clearNotif(){document.getElementById('notifList').innerHTML='<div class="notif-empty">Немає нових сповіщень</div>';const d=document.getElementById('notifDot');if(d)d.style.display='none';toast('success','Позначено прочитаним');}
document.addEventListener('click',e=>{const w=document.querySelector('.notif-wrap');if(w&&!w.contains(e.target)){const p=document.getElementById('notifPanel');if(p)p.classList.remove('show');}});

function openMore(){document.getElementById('moreSheet').classList.add('show');document.getElementById('moreOverlay').classList.add('show');document.body.style.overflow='hidden';syncMore(currentView);}
function closeMore(){document.getElementById('moreSheet').classList.remove('show');document.getElementById('moreOverlay').classList.remove('show');document.body.style.overflow='';}
function goMore(v){closeMore();go(v);}
function syncMore(v){document.querySelectorAll('#moreSheet a[data-view]').forEach(a=>a.classList.toggle('active',a.dataset.view===v));}

let currentView='patients';
function go(view){
  currentView=view;closeRowMenu();
  const np=document.getElementById('notifPanel');if(np)np.classList.remove('show');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const _v=document.getElementById('view-'+view);if(!_v){toast('info','Розділ у розробці');return;}_v.classList.add('active');
  document.querySelectorAll('.nav-item[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  const inBottom=['patients','operations','report','journal'].includes(view);
  document.querySelectorAll('.bottom-nav a[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  const scho=document.querySelector('.bottom-nav a:last-child');if(scho)scho.classList.toggle('active',!inBottom);
  syncMore(view);
  if(view==='statistics')renderStats();
  if(view==='journal')renderJournal();
  window.scrollTo({top:0,behavior:'smooth'});
}

function pickRole(el){document.querySelectorAll('.role-card').forEach(r=>r.classList.remove('active'));el.classList.add('active');document.getElementById('sideRole').textContent=el.dataset.role;}
function togglePass(id){const i=document.getElementById(id);i.type=i.type==='password'?'text':'password';}
function doLogin(){
  const name=document.getElementById('loginName').value.trim();
  const pass=document.getElementById('loginPass').value;
  if(!name){toast('error','Введіть прізвище');return;}
  const u=DB.login(name,pass);
  if(!u){toast('error','Невірне прізвище або пароль');return;}
  currentUser=u;
  const roleLabel={admin:'Адміністратор',doctor:'Лікар',viewer:'Спостерігач'}[u.role]||u.role;
  document.getElementById('sideRole').textContent=roleLabel;
  document.querySelectorAll('.side-user .nm').forEach(el=>el.textContent=u.name);
  document.querySelectorAll('.side-user .avatar, .top-user .avatar').forEach(el=>el.textContent=initials(u.name));
  document.querySelectorAll('.top-user .nm').forEach(el=>el.textContent=roleLabel);
  applyPermissions();
  document.getElementById('login').style.display='none';
  document.getElementById('app').classList.add('show');
  document.getElementById('bottomNav').style.display='';
  toast('success','Вхід виконано. Вітаємо, '+u.name+'!');
  go('patients');
}
function logout(){currentUser=null;document.getElementById('app').classList.remove('show');document.getElementById('bottomNav').style.display='none';document.getElementById('login').style.display='grid';document.getElementById('loginPass').value='';toast('info','Ви вийшли із системи');}
function rowMenu(){}

/* Modals */
function openModal(id){if(id==='m-add')resetAddForm();document.getElementById(id).classList.add('show');document.body.style.overflow='hidden';}
function closeModal(id){document.getElementById(id).classList.remove('show');document.body.style.overflow='';}
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o){o.classList.remove('show');document.body.style.overflow='';}}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.overlay.show').forEach(o=>{o.classList.remove('show');document.body.style.overflow='';});closeDrawer();closeMore();closeRowMenu();const np=document.getElementById('notifPanel');if(np)np.classList.remove('show');}});

function showDupes(){document.getElementById('dupeResults').style.display='block';toast('success','Пошук виконано');}

/* Settings */
function openSettings(){if(!needRights('settings'))return;const p=document.getElementById('gatePass').value;if(!p){toast('error','Введіть пароль розробника');return;}document.getElementById('settingsGate').style.display='none';document.getElementById('settingsPanel').style.display='block';toast('success','Доступ надано');}
function checkWipe(v){document.getElementById('wipeBtn').disabled=(v.trim()!=='ОЧИСТИТИ');}
function wipeDB(){if(!needRights('settings'))return;openConfirm('Очистити базу?','Усі локальні дані тестової версії буде видалено та відновлено початковий стан.',()=>{DB.reset();document.getElementById('wipeConfirm').value='';checkWipe('');refreshData();renderOps();toast('success','Базу очищено (відновлено демо-дані)');});}

function topSearch(v){if(!document.getElementById('view-patients').classList.contains('active'))go('patients');document.getElementById('ptSearch').value=v;ptPage=1;renderPatients();}

/* Toast */
function toast(type,msg){
  const icons={success:'<path d="M20 6L9 17l-5-5" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',error:'<circle cx="12" cy="12" r="9" stroke="#EF4444" stroke-width="1.8"/><path d="M12 8v5M12 16v.5" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round"/>',warning:'<path d="M12 3l9 16H3z" stroke="#F59E0B" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9v4" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round"/>',info:'<circle cx="12" cy="12" r="9" stroke="#3B82F6" stroke-width="1.8"/><path d="M12 11v5M12 8v.5" stroke="#3B82F6" stroke-width="1.8" stroke-linecap="round"/>'};
  const el=document.createElement('div');el.className='toast '+type;
  el.innerHTML='<svg class="tic" viewBox="0 0 24 24" fill="none">'+icons[type]+'</svg><div class="msg">'+msg+'</div>';
  document.getElementById('toastWrap').appendChild(el);
  setTimeout(()=>{el.style.transition='opacity .3s,transform .3s';el.style.opacity='0';el.style.transform='translateX(30px)';setTimeout(()=>el.remove(),300);},3200);
}

/* ---------- Init ---------- */
renderPatients();
renderOps();
renderReport();
renderJournal();
renderStats();
renderNotifs();
