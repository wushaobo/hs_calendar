// IndexedDB 封装。业务数据只进 IndexedDB，不做 localStorage 降级。

const DB_NAME = 'hs_calendar';
const DB_VERSION = 1;
const STORE_RECORDS = 'day_records';
const STORE_HOLIDAYS = 'holidays';
const STORE_OVERRIDES = 'workday_overrides';

let dbPromise = null;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB 请求失败'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB 事务失败'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB 事务中止'));
  });
}

export function openDb() {
  if (dbPromise) return dbPromise;
  const pending = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }

    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORE_HOLIDAYS)) {
        db.createObjectStore(STORE_HOLIDAYS, { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains(STORE_OVERRIDES)) {
        db.createObjectStore(STORE_OVERRIDES, { keyPath: 'date' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error || new Error('无法打开本地数据库'));
    request.onblocked = () => reject(new Error('本地数据库被其他页面占用，请关闭其他标签页后重试'));
  });
  dbPromise = pending.catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

export async function seedCalendar(calendarJson) {
  const db = await openDb();
  const holidays = Array.isArray(calendarJson.holidays) ? calendarJson.holidays : [];
  const overrides = Array.isArray(calendarJson.workdayOverrides)
    ? calendarJson.workdayOverrides
    : [];

  const transaction = db.transaction([STORE_HOLIDAYS, STORE_OVERRIDES], 'readwrite');
  const holidayStore = transaction.objectStore(STORE_HOLIDAYS);
  const overrideStore = transaction.objectStore(STORE_OVERRIDES);

  holidayStore.clear();
  overrideStore.clear();

  for (const item of holidays) {
    holidayStore.put({ date: item.date, name: typeof item.name === 'string' ? item.name : '' });
  }
  for (const item of overrides) {
    overrideStore.put({ date: item.date, name: typeof item.name === 'string' ? item.name : '' });
  }

  await transactionDone(transaction);
}

export async function readStoredCalendar() {
  const db = await openDb();
  const transaction = db.transaction([STORE_HOLIDAYS, STORE_OVERRIDES], 'readonly');
  const done = transactionDone(transaction);
  const holidays = await requestToPromise(transaction.objectStore(STORE_HOLIDAYS).getAll());
  const overrides = await requestToPromise(transaction.objectStore(STORE_OVERRIDES).getAll());
  await done;
  return { holidays, workdayOverrides: overrides };
}

export async function getAllRecords() {
  const db = await openDb();
  const transaction = db.transaction(STORE_RECORDS, 'readonly');
  const done = transactionDone(transaction);
  const records = await requestToPromise(transaction.objectStore(STORE_RECORDS).getAll());
  await done;
  return Array.isArray(records) ? records : [];
}

export async function putRecord(record) {
  const db = await openDb();
  const transaction = db.transaction(STORE_RECORDS, 'readwrite');
  transaction.objectStore(STORE_RECORDS).put(record);
  await transactionDone(transaction);
}

export async function deleteRecord(date) {
  const db = await openDb();
  const transaction = db.transaction(STORE_RECORDS, 'readwrite');
  transaction.objectStore(STORE_RECORDS).delete(date);
  await transactionDone(transaction);
}

export function closeDb() {
  if (!dbPromise) return;
  dbPromise
    .then((db) => db.close())
    .catch(() => {})
    .finally(() => {
      dbPromise = null;
    });
}
