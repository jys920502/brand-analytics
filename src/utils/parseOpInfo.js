import * as XLSX from 'xlsx';

/**
 * 영업정보 .xls 파일 파서
 * 파일명 형식: YYYY-MM.xls
 * 시트: 사업장별 일별 매출/고객수/영수건수/영수단가 데이터
 */

const STORE_MAP = {
  '피에프창롯데월드몰점': '잠실',
  '피에프창신세계대구점': '대구',
  '피에프창서초점': '서초',
  '피에프창센텀시티몰점': '센텀',
  '피에프창신세계광주점': '광주',
  '피에프창신세계사우스시티': '사우스시티',
  '피에프창용산아이파크몰점': '용산',
  '피에프창코엑스몰점': '코엑스',
  '[폐점]피에프창타임스퀘어점': '타임스퀘어',
};

function mapStore(name) {
  return STORE_MAP[String(name).trim()] || String(name).trim();
}

function parseDate(dateStr) {
  // '2026-01-01(목)' → '2026-01-01'
  if (!dateStr) return null;
  const m = String(dateStr).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(val * 1000) / 1000;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

/**
 * 단일 영업정보 .xls 파일 파싱
 * 반환값: [{ store, year, month, key, dailyOp: [...] }, ...]
 */
export function parseOpInfoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        // 파일명에서 year/month 추출 (예: 2026-01.xls)
        const baseName = file.name.replace(/\.xls$/i, '');
        const parts = baseName.split('-');
        const year = parts[0];
        const month = parts[1];

        if (!year || !month) {
          reject(new Error(`파일명 형식 오류 (YYYY-MM.xls): ${file.name}`));
          return;
        }

        // 컬럼 인덱스 (헤더 Row 1 기준):
        // 0:empty, 1:사업장, 2:매출일, 3:구분, 4:매출액, 5:증감율, 6:고객수, 7:증감율,
        // 8:객단가, 9:증감율, 10:영수건수, 11:증감율, 12:영수단가, 13:증감율,
        // 14:영수건당고객수, 15:증감율
        const storeMap = {};

        for (let r = 2; r < rows.length; r++) {
          const row = rows[r];
          if (!row) continue;

          const storeName = row[1];
          const dateRaw = row[2];
          const division = row[3]; // 점심/저녁/계

          // '계' 행만 처리, 총계 제외
          if (division !== '계') continue;
          if (!storeName || String(storeName).includes('총계')) continue;

          const store = mapStore(storeName);
          const date = parseDate(dateRaw);
          if (!date) continue;

          const key = `op-${store}-${year}-${month}`;
          if (!storeMap[store]) {
            storeMap[store] = { store, year, month, key, dailyOp: [] };
          }

          storeMap[store].dailyOp.push({
            date,
            sales: parseNum(row[4]),
            guests: parseNum(row[6]),
            avgPerGuest: parseNum(row[8]),
            txCount: parseNum(row[10]),
            avgPerTx: parseNum(row[12]),
            txGuestRatio: parseNum(row[14]),
          });
        }

        resolve(Object.values(storeMap));
      } catch (err) {
        reject(new Error(`영업정보 파싱 오류 (${file.name}): ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error(`파일 읽기 실패: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseMultipleOpInfoFiles(files) {
  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const fileResults = await parseOpInfoFile(file);
      results.push(...fileResults);
    } catch (err) {
      errors.push(err.message);
    }
  }

  return { results, errors };
}
