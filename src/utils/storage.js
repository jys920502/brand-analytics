/**
 * IndexedDB 기반 데이터 영속성 유틸리티
 * 브라우저를 닫았다 열어도 업로드한 데이터가 유지됩니다.
 */

const DB_NAME = 'brand-analytics-db';
const DB_VERSION = 2; // 영업정보 스토어 추가로 버전 업
const SALES_STORE = 'sales-data';
const OP_STORE = 'op-data';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        db.createObjectStore(SALES_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(OP_STORE)) {
        db.createObjectStore(OP_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ─── 이지포스 판매 데이터 ───────────────────────────────

export async function saveAllData(allData) {
  try {
    const db = await openDB();
    const tx = db.transaction(SALES_STORE, 'readwrite');
    const store = tx.objectStore(SALES_STORE);
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

export async function loadAllData() {
  try {
    const db = await openDB();
    const tx = db.transaction(SALES_STORE, 'readonly');
    const store = tx.objectStore(SALES_STORE);
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

export async function clearAllData() {
  try {
    const db = await openDB();
    const tx = db.transaction(SALES_STORE, 'readwrite');
    tx.objectStore(SALES_STORE).clear();
    return new Promise((resolve) => { tx.oncomplete = () => resolve(true); });
  } catch (err) {
    console.warn('IndexedDB 삭제 실패:', err);
    return false;
  }
}

// ─── 영업정보 데이터 (고객수·영수건수·영수단가) ────────────

export async function saveOpData(opData) {
  try {
    const db = await openDB();
    const tx = db.transaction(OP_STORE, 'readwrite');
    const store = tx.objectStore(OP_STORE);
    store.clear();
    opData.forEach((d) => store.put(d));
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB 영업정보 저장 실패:', err);
    return false;
  }
}

export async function loadOpData() {
  try {
    const db = await openDB();
    const tx = db.transaction(OP_STORE, 'readonly');
    const store = tx.objectStore(OP_STORE);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB 영업정보 불러오기 실패:', err);
    return [];
  }
}

export async function clearOpData() {
  try {
    const db = await openDB();
    const tx = db.transaction(OP_STORE, 'readwrite');
    tx.objectStore(OP_STORE).clear();
    return new Promise((resolve) => { tx.oncomplete = () => resolve(true); });
  } catch (err) {
    console.warn('IndexedDB 영업정보 삭제 실패:', err);
    return false;
  }
}
