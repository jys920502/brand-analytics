import * as XLSX from 'xlsx';

/**
 * 이지포스 "상품_일별_매출분석" 엑셀 파일을 파싱합니다.
 * 파일명 형식: 매장명-YYYY-MM.xlsx
 */
export function parseEasyPosFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets['상품_일별_매출분석'];

        if (!sheet) {
          reject(new Error(`시트를 찾을 수 없습니다: ${file.name}`));
          return;
        }

        // 파일명에서 매장명, 연도, 월 추출 (예: 잠실-2026-01.xlsx)
        const baseName = file.name.replace('.xlsx', '').replace('.XLSX', '');
        const parts = baseName.split('-');
        const month = parts.pop();
        const year = parts.pop();
        const store = parts.join('-');

        // 시트를 2D 배열로 변환
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        // 1행: 헤더 (대분류, 중분류, ..., 날짜들)
        // 2행: 날짜별 서브헤더 (수량, 총매출액, NET매출액, 현금금액, 카드금액, 매출건수)
        // 3행~: 데이터 (마지막 행: 합계)
        const headerRow = rows[0];

        // 날짜 컬럼 위치 파악 (13번째 컬럼부터, 6개 단위로 날짜 반복)
        const DATE_START_COL = 13;
        const COLS_PER_DAY = 6;

        const dates = [];
        for (let col = DATE_START_COL; col < headerRow.length; col += COLS_PER_DAY) {
          if (headerRow[col]) {
            dates.push({ date: String(headerRow[col]), colIndex: col });
          }
        }

        // 합계 행 찾기
        let totalRow = null;
        for (let i = rows.length - 1; i >= 2; i--) {
          if (rows[i] && rows[i][0] === '합계') {
            totalRow = rows[i];
            break;
          }
        }

        if (!totalRow) {
          reject(new Error(`합계 행을 찾을 수 없습니다: ${file.name}`));
          return;
        }

        const totalQty = parseNum(totalRow[6]);
        const totalSales = parseNum(totalRow[7]);

        // 일별 데이터 추출
        const dailyTotals = dates.map(({ date, colIndex }) => ({
          date,
          qty: parseNum(totalRow[colIndex]),
          sales: parseNum(totalRow[colIndex + 1]),
          netSales: parseNum(totalRow[colIndex + 2]),
          cash: parseNum(totalRow[colIndex + 3]),
          card: parseNum(totalRow[colIndex + 4]),
          txCount: parseNum(totalRow[colIndex + 5]),
        }));

        // 상품별 데이터 (P-Mix용 - Phase 2)
        const products = [];
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row[0] === '합계' || !row[4]) continue;
          products.push({
            mainCat: row[0] || '',
            midCat: row[1] || '',
            subCat: row[2] || '',
            code: row[3] || '',
            name: row[4] || '',
            totalQty: parseNum(row[6]),
            totalSales: parseNum(row[7]),
            netSales: parseNum(row[8]),
          });
        }

        resolve({
          store, year, month,
          key: `${store}-${year}-${month}`,
          totalQty, totalSales,
          dailyTotals, products,
        });
      } catch (err) {
        reject(new Error(`파일 파싱 오류 (${file.name}): ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error(`파일 읽기 실패: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const num = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
}

export async function parseMultipleFiles(files) {
  const results = [];
  const errors = [];
  for (const file of files) {
    try {
      results.push(await parseEasyPosFile(file));
    } catch (err) {
      errors.push(err.message);
    }
  }
  return { results, errors };
}
