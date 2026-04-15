/**
 * IndexedDB 기반 데이터 영속성 유틸리티
 * 브라우저를 닫았다 열어도 업로드한 데이터가 유지됩니다.
 */

const DB_NAME = 'brand-analytics-db';
const DB_VERSION = 1;
const STORE_NAME = 'sales-data';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

/** 파싱된 데이터 전체를 저장 */
export async function saveAllData(allData) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // 기존 데이터 전체 삭제 후 재저장
    store.clear();
    allData.forEach((d) => store.put(d));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB 저장 실패:', err);
    return false;
  }
}

/** 저장된 데이터 전체 불러오기 */
export async function loadAllData() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB 불러오기 실패:', err);
    return [];
  }
}

/** 저장된 데이터 전체 삭제 */
export async function clearAllData() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    return new Promise((resolve) => { tx.oncomplete = () => resolve(true); });
  } catch (err) {
    console.warn('IndexedDB 삭제 실패:', err);
    return false;
  }
}
