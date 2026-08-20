/* ============================================================
   OKL Hospital — DATA LAYER (store.js)
   ------------------------------------------------------------
   Тестова версія зберігає дані у localStorage браузера.
   Уся робота з даними йде через об'єкт DB — щоб перейти на
   бойовий бекенд, достатньо замінити реалізацію методів нижче
   на fetch() до ваших Cloud Functions (europe-west1-okl-hospital-41197),
   НЕ змінюючи app.js. Місця для заміни позначені  // TODO(API).
   ============================================================ */
const DB = (function () {
  const KEY = 'okl_db_v1';

  // ---- Початкові (демо) дані ----
  const SEED = {
    patients: [
      p('Іваненко Олександр Сергійович','230479',34,'mil','Хірургія','Множинне осколкове поранення нижніх кінцівок','ЗСУ','2026-08-13','Стабільний','Лежачий',true,false),
      p('Коваленко Андрій Миколайович','230412',28,'mil','Травматологія','Перелом стегнової кістки закритий, зі зміщенням','НГУ','2026-08-02','Важкий','Лежачий',true,false),
      p('Петренко Максим Ігорович','230298',31,'mil','Неврологія 1','Черепно-мозкова травма середнього ступеня тяжкості','ЗСУ','2026-08-10','Легкий','Сидячий',false,false),
      p('Бондар Сергій Анатолійович','230187',27,'mil','Кардіологія','Гіпертонічна хвороба, ризик високий','ДПСУ','2026-08-16','Середній','Сидячий',false,false),
      p('Мельник Ірина Володимирівна','230155',29,'mil','Гастроентерологія','Пневмонія двобічна, середнього ступеня','ЗСУ','2026-08-14','Стабільний','Лежачий',false,false),
      p('Шевченко Дмитро Олегович','230102',24,'mil','Хірургія','Вогнепальне поранення черевної порожнини','НГУ','2026-07-29','Важкий','Лежачий',true,true),
      p('Романюк Ігор Васильович','230074',33,'mil','Травматологія','Перелом плечової кістки','ЗСУ','2026-08-07','Середній','Сидячий',false,false),
      p('Гнатюк Павло Олександрович','230031',26,'mil','Неврологія 2','Струс головного мозку','ДПСУ','2026-08-17','Легкий','Сидячий',false,false),
      p('Мороз Віктор Іванович','230066',37,'mil','Хірургія','Осколкове поранення грудної клітки','ЗСУ','2026-08-11','Середній','Лежачий',false,false),
      p('Савченко Олег Петрович','230045',30,'mil','Кардіологія','Порушення ритму серця','НГУ','2026-08-05','Стабільний','Сидячий',false,false),
      p('Ткаченко Олена Петрівна','230510',42,'civ','Кардіологія','Гострий коронарний синдром','Ургентно','2026-08-18','Важкий','Лежачий',false,false),
      p('Лисенко Ганна Іванівна','230498',35,'civ','Ендокринологія','Планова госпіталізація, обстеження','Планово','2026-08-19','Стабільний','Сидячий',false,false),
    ],
    kv: {}, // ops / report-beds / journal та інші збережені форми
    seq: 230600,

    /* ---- Користувачі, які можуть входити ----
       role: 'admin'  — повний доступ (усі розділи + налаштування)
             'doctor' — пацієнти / операції / журнал / звіт (без налаштувань)
             'viewer' — лише перегляд (без редагування)
       Щоб додати користувача — додайте об'єкт до масиву нижче. */
    users: [
      { login: 'Врагов',    pass: 'dir2026',    role: 'admin',  name: 'Руслан Врагов' },
      { login: 'Войтович',    pass: 'admin2026',    role: 'admin',  name: 'Сергій Войтович' },
      { login: 'Даниленко',    pass: 'admin12026',    role: 'admin',  name: 'Віталій Даниленко' },
      { login: 'Лікар',    pass: 'likar2026',  role: 'doctor', name: 'Черговий лікар' },
    ],
  };

  function p(name, idno, age, type, dept, diag, cat, hospISO, triage, evac, cert, pow) {
    return { id: 'p' + idno, type, name, idno, age, dept, diag, cat, hospISO, triage, evac,
      cert: !!cert, pow: !!pow, status: 'active', dischargeType: '', dischargeISO: '', deathTime: '', note: '' };
  }

  let state = migrate(load());
  persist(); // зберегти після можливої міграції

  function load() {
    try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}
    return JSON.parse(JSON.stringify(SEED));
  }
  // Доповнює старі збережені дані відсутніми полями (сумісність зі старими версіями)
  function migrate(st) {
    if (!st || typeof st !== 'object') st = {};
    if (!Array.isArray(st.patients)) st.patients = JSON.parse(JSON.stringify(SEED.patients));
    // Користувачі ЗАВЖДИ беруться з коду (store.js), а не з кешу — щоб додані
    // у масив users зміни одразу застосовувалися після перезавантаження сторінки.
    st.users = JSON.parse(JSON.stringify(SEED.users));
    if (!st.kv || typeof st.kv !== 'object') st.kv = {};
    if (typeof st.seq !== 'number') st.seq = SEED.seq;
    return st;
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  return {
    // ---- Пацієнти ----  // TODO(API): замінити на GET/POST/PATCH/DELETE /patients
    patients() { return state.patients; },
    addPatient(obj) {
      obj.id = 'p' + (++state.seq);
      obj.idno = String(state.seq);
      state.patients.unshift(obj);
      persist();
      return obj;
    },
    updatePatient(id, patch) {
      const i = state.patients.findIndex(x => x.id === id);
      if (i < 0) return null;
      Object.assign(state.patients[i], patch);
      persist();
      return state.patients[i];
    },
    removePatient(id) {
      state.patients = state.patients.filter(x => x.id !== id);
      persist();
    },
    getPatient(id) { return state.patients.find(x => x.id === id) || null; },

    // ---- Довільні форми (операції, звіт, ліжка, журнал) ----  // TODO(API): окремі ендпоінти
    getKV(k) { return state.kv[k]; },
    setKV(k, v) { state.kv[k] = v; persist(); },

    // ---- Автентифікація (тестова, локальна) ----
    // TODO(API): замінити на Firebase Authentication + перевірку ролі на сервері
    login(loginName, pass) {
      const n = (loginName || '').trim().toLowerCase();
      return (state.users || []).find(u => u.login.toLowerCase() === n && u.pass === pass) || null;
    },
    users() { return state.users || []; },

    // ---- Сервіс ----
    reset() {
      state = JSON.parse(JSON.stringify(SEED)); // повне відновлення (дані + користувачі з коду)
      persist();
    },
  };
})();
