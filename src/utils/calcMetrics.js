export function formatKRW(num) {
  if (!num && num !== 0) return '-';
  return Math.round(num).toLocaleString('ko-KR');
}

export function formatShort(num) {
  if (!num && num !== 0) return '-';
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}억`;
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
  return Math.round(num).toLocaleString('ko-KR');
}

export function calcGrowthRate(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function filterData(allData, filters) {
  return allData.filter((d) => {
    const yearMatch = !filters.year || d.year === filters.year;
    const monthMatch = !filters.months?.length || filters.months.includes(d.month);
    const storeMatch = !filters.stores?.length || filters.stores.includes(d.store);
    return yearMatch && monthMatch && storeMatch;
  });
}

export function aggregateByStore(allData, filters) {
  const filtered = filterData(allData, filters);
  const storeMap = {};
  filtered.forEach((d) => {
    if (!storeMap[d.store]) {
      storeMap[d.store] = { store: d.store, totalSales: 0, totalTxCount: 0 };
    }
    storeMap[d.store].totalSales += d.totalSales;
    storeMap[d.store].totalTxCount += d.dailyTotals.reduce((s, day) => s + day.txCount, 0);
  });
  return Object.values(storeMap).map((s) => ({
    ...s,
    avgSalesPerTx: s.totalTxCount > 0 ? s.totalSales / s.totalTxCount : 0,
  }));
}

export function aggregateByMonth(allData, filters) {
  const filtered = filterData(allData, filters);
  const monthMap = {};
  filtered.forEach((d) => {
    const key = `${d.year}-${d.month}`;
    if (!monthMap[key]) {
      monthMap[key] = { yearMonth: key, year: d.year, month: d.month, totalSales: 0, totalTxCount: 0 };
    }
    monthMap[key].totalSales += d.totalSales;
    monthMap[key].totalTxCount += d.dailyTotals.reduce((s, day) => s + day.txCount, 0);
  });
  return Object.values(monthMap).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

export function getYears(allData) {
  return [...new Set(allData.map((d) => d.year))].sort();
}

export function getStores(allData) {
  return [...new Set(allData.map((d) => d.store))].sort();
}
