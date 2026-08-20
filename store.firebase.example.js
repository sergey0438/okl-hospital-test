/* ============================================================
   ПРИКЛАД: як замінити localStorage на бойовий бекенд.
   Це шаблон — НЕ підключений за замовчуванням.
   Щоб увімкнути: замініть вміст store.js на подібний код,
   app.js чіпати не потрібно (той самий інтерфейс DB).
   ------------------------------------------------------------
   Ваш API: https://europe-west1-okl-hospital-41197.cloudfunctions.net/api
   ============================================================ */

const API = 'https://europe-west1-okl-hospital-41197.cloudfunctions.net/api';

// Токен після входу через Firebase Authentication (getIdToken()).
// Зберігати в пам'яті, НЕ в localStorage.
let AUTH_TOKEN = null;
function setToken(t){ AUTH_TOKEN = t; }

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(AUTH_TOKEN ? { 'Authorization': 'Bearer ' + AUTH_TOKEN } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401 || res.status === 403) throw new Error('Немає доступу');
  if (!res.ok) throw new Error('Помилка запиту: ' + res.status);
  return res.status === 204 ? null : res.json();
}

/*
  Важливо: app.js викликає DB методи синхронно (renderPatients читає
  DB.patients()). Для реального API зробіть локальний кеш, який
  наповнюється при завантаженні, а мутації відправляйте на сервер і
  оновлюйте кеш + перемальовуйте. Скелет:
*/
const DB = (function () {
  let cache = { patients: [], kv: {} };

  async function loadAll() {
    cache.patients = await apiFetch('/patients');       // GET
    // за потреби: cache.kv.ops = await apiFetch('/operations?date=...')
  }

  return {
    loadAll,                              // виклик після логіну, потім refreshData()
    patients() { return cache.patients; },

    async addPatient(obj) {               // POST /patients
      const saved = await apiFetch('/patients', { method: 'POST', body: JSON.stringify(obj) });
      cache.patients.unshift(saved);
      return saved;
    },
    async updatePatient(id, patch) {      // PATCH /patients/:id
      const saved = await apiFetch('/patients/' + id, { method: 'PATCH', body: JSON.stringify(patch) });
      const i = cache.patients.findIndex(p => p.id === id);
      if (i >= 0) cache.patients[i] = saved;
      return saved;
    },
    async removePatient(id) {             // DELETE /patients/:id  (краще «м'яке» видалення на сервері)
      await apiFetch('/patients/' + id, { method: 'DELETE' });
      cache.patients = cache.patients.filter(p => p.id !== id);
    },
    getPatient(id) { return cache.patients.find(p => p.id === id) || null; },

    getKV(k) { return cache.kv[k]; },
    async setKV(k, v) {                   // напр. POST /operations, /report, /journal
      cache.kv[k] = v;
      await apiFetch('/' + k, { method: 'POST', body: JSON.stringify(v) });
    },
    reset() { /* на бойовому — недоступно з фронтенду, лише через захищений ендпоінт */ },
  };
})();

/*
  Приклад входу через Firebase Authentication (замість спільного пароля):

  import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
  const auth = getAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  setToken(await cred.user.getIdToken());
  const claims = (await cred.user.getIdTokenResult()).claims; // roles: claims.role
  await DB.loadAll();
  // далі показувати UI відповідно до claims.role (admin / doctor)

  Роль встановлюється адміном через custom claims (Admin SDK, окремий скрипт),
  а СЕРВЕР перевіряє токен і роль на кожному ендпоінті — це і є справжня
  межа безпеки.
*/
