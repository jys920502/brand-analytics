import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import FileUpload from './FileUpload';
import OpInfoUpload from './OpInfoUpload';
import FilterBar from './FilterBar';
import PMix from './PMix';
import DailyTrend from './DailyTrend';
import YoY from './YoY';
import {
  aggregateByStore, aggregateByMonth, getYears, getStores,
  formatKRW, formatShort,
} from '../utils/calcMetrics';
import { saveAllData, loadAllData, clearAllData, saveOpData, loadOpData, clearOpData } from '../utils/storage';
import './Dashboard.css';

export default function Dashboard() {
  const [allData, setAllData] = useState([]);
  const [opData, setOpData] = useState([]);
  const [filters, setFilters] = useState({ year: '', months: [], stores: [] });
  const [activeTab, setActiveTab] = useState('overview');
  const [dbLoading, setDbLoading] = useState(true);

  // 앱 시작 시 저장된 데이터 불러오기
  useEffect(() => {
    Promise.all([loadAllData(), loadOpData()]).then(([saved, savedOp]) => {
      if (saved.length > 0) {
        setAllData(saved);
        const years = [...new Set(saved.map((d) => d.year))].sort();
        setFilters((f) => ({ ...f, year: years[years.length - 1] }));
      }
      if (savedOp.length > 0) setOpData(savedOp);
      setDbLoading(false);
    });
  }, []);

  const handleDataLoaded = (newResults) => {
    setAllData((prev) => {
      const map = {};
      [...prev, ...newResults].forEach((d) => { map[d.key] = d; });
      const merged = Object.values(map);
      saveAllData(merged);
      return merged;
    });
    if (newResults.length > 0 && !filters.year) {
      const years = [...new Set(newResults.map((d) => d.year))].sort();
      setFilters((f) => ({ ...f, year: years[years.length - 1] }));
    }
  };

  const handleOpDataLoaded = (newResults) => {
    setOpData((prev) => {
      const map = {};
      [...prev, ...newResults].forEach((d) => { map[d.key] = d; });
      const merged = Object.values(map);
      saveOpData(merged);
      return merged;
    });
  };

  const handleClearData = async () => {
    if (window.confirm('저장된 데이터를 모두 삭제할까요? (이지포스 + 영업정보)')) {
      await Promise.all([clearAllData(), clearOpData()]);
      setAllData([]);
      setOpData([]);
      setFilters({ year: '', months: [], stores: [] });
    }
  };

  const years = useMemo(() => getYears(allData), [allData]);
  const stores = useMemo(() => getStores(allData), [allData]);
  const storeData = useMemo(() => aggregateByStore(allData, filters), [allData, filters]);
  const monthlyData = useMemo(() => aggregateByMonth(allData, filters), [allData, filters]);

  // 총 매출 (이지포스 기반)
  const totalSales = storeData.reduce((s, d) => s + d.totalSales, 0);

  // 영업정보 기반 KPI (필터 적용)
  const filteredOpData = useMemo(() => {
    return opData.filter((d) => {
      const yearMatch = !filters.year || d.year === filters.year;
      const monthMatch = !filters.months?.length || filters.months.includes(d.month);
      const storeMatch = !filters.stores?.length || filters.stores.includes(d.store);
      return yearMatch && monthMatch && storeMatch;
    });
  }, [opData, filters]);

  const { totalGuests, totalTx, avgPerTx, avgPerGuest } = useMemo(() => {
    let guests = 0, tx = 0;
    filteredOpData.forEach((d) => {
      d.dailyOp.forEach((day) => {
        guests += day.guests;
        tx += day.txCount;
      });
    });
    return {
      totalGuests: guests,
      totalTx: tx,
      avgPerTx: tx > 0 ? totalSales / tx : 0,
      avgPerGuest: guests > 0 ? totalSales / guests : 0,
    };
  }, [filteredOpData, totalSales]);

  const hasOpData = opData.length > 0;
  const storeSalesChart = [...storeData].sort((a, b) => b.totalSales - a.totalSales);

  if (dbLoading) {
    return (
      <div className="dashboard-empty">
        <div className="empty-title">⏳ 데이터 불러오는 중...</div>
      </div>
    );
  }

  if (allData.length === 0) {
    return (
      <div className="dashboard-empty">
        <div className="empty-title">📊 브랜드 매출 분석 대시보드</div>
        <div className="empty-sub">이지포스 엑셀 파일을 업로드하면 분석이 시작됩니다</div>
        <FileUpload onDataLoaded={handleDataLoaded} existingCount={0} />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div className="dash-title">📊 브랜드 매출 분석 대시보드</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#9ca3af' }}>💾 자동저장됨</span>
          <button className="btn-clear" onClick={handleClearData}>데이터 초기화</button>
        </div>
      </div>

      <FilterBar years={years} stores={stores} filters={filters} onFilterChange={setFilters} />

      <div className="kpi-row">
        <KpiCard label="총 매출" value={formatShort(totalSales)} sub={`${formatKRW(totalSales)}원`} color="#0d2258" />
        {hasOpData ? (
          <>
            <KpiCard label="총 고객수" value={formatKRW(totalGuests)} sub="명" color="#1d4ed8" />
            <KpiCard label="영수단가" value={formatKRW(Math.round(avgPerTx))} sub="원/건" color="#7c3aed" />
            <KpiCard label="객단가" value={formatKRW(Math.round(avgPerGuest))} sub="원/명" color="#0f766e" />
          </>
        ) : (
          <>
            <KpiCard label="매장 수" value={stores.length} sub="개 매장" color="#1d4ed8" />
            <KpiCard label="로드된 파일" value={allData.length} sub="개 (매장×월)" color="#7c3aed" />
            <KpiCard label="영업정보" value="미로드" sub="↑ 탭에서 업로드" color="#9ca3af" badge />
          </>
        )}
      </div>

      <div className="tab-bar">
        {[
          ['overview', '매장별 비교'],
          ['monthly', '월별 추이'],
          ['opinfo', `영업정보${hasOpData ? ` (${opData.length}건)` : ' ⬆'}`],
          ['pmix', 'P-Mix'],
          ['daily', '일별 추이'],
          ['yoy', '전년 대비'],
          ['upload', '파일 추가'],
        ].map(([key, label]) => (
          <button key={key} className={`tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="chart-card">
            <div className="chart-title">매장별 총 매출</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storeSalesChart} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="store" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '매출']} />
                <Bar dataKey="totalSales" fill="#0d2258" radius={[4,4,0,0]} name="총 매출" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {hasOpData && (
            <div className="chart-grid-2">
              <div className="chart-card">
                <div className="chart-title">매장별 총 고객수</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={storeOpChart(storeData, filteredOpData)} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="store" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v.toLocaleString()}명`, '고객수']} />
                    <Bar dataKey="guests" fill="#1d4ed8" radius={[4,4,0,0]} name="고객수" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <div className="chart-title">매장별 영수단가</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={storeOpChart(storeData, filteredOpData)} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="store" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '영수단가']} />
                    <Bar dataKey="avgPerTx" fill="#7c3aed" radius={[4,4,0,0]} name="영수단가" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="chart-card">
            <div className="chart-title">매장별 상세 현황</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>매장</th><th>총 매출</th>
                  {hasOpData && <><th>고객수</th><th>영수건수</th><th>영수단가</th><th>객단가</th></>}
                </tr>
              </thead>
              <tbody>
                {storeSalesChart.map((s) => {
                  const op = filteredOpData.filter((d) => d.store === s.store);
                  const guests = op.reduce((a, d) => a + d.dailyOp.reduce((b, day) => b + day.guests, 0), 0);
                  const tx = op.reduce((a, d) => a + d.dailyOp.reduce((b, day) => b + day.txCount, 0), 0);
                  return (
                    <tr key={s.store}>
                      <td className="td-store">{s.store}</td>
                      <td className="td-num">{formatKRW(s.totalSales)}원</td>
                      {hasOpData && (
                        <>
                          <td className="td-num">{formatKRW(guests)}명</td>
                          <td className="td-num">{formatKRW(tx)}건</td>
                          <td className="td-num">{formatKRW(Math.round(tx > 0 ? s.totalSales / tx : 0))}원</td>
                          <td className="td-num">{formatKRW(Math.round(guests > 0 ? s.totalSales / guests : 0))}원</td>
                        </>
                      )}
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td>합계</td>
                  <td className="td-num">{formatKRW(totalSales)}원</td>
                  {hasOpData && (
                    <>
                      <td className="td-num">{formatKRW(totalGuests)}명</td>
                      <td className="td-num">{formatKRW(totalTx)}건</td>
                      <td className="td-num">{formatKRW(Math.round(avgPerTx))}원</td>
                      <td className="td-num">{formatKRW(Math.round(avgPerGuest))}원</td>
                    </>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="tab-content">
          <div className="chart-card">
            <div className="chart-title">월별 매출 추이</div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '매출']} />
                <Legend />
                <Line type="monotone" dataKey="totalSales" stroke="#0d2258" strokeWidth={2} dot={{ r: 4 }} name="총 매출" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {hasOpData && <MonthlyOpChart opData={opData} filters={filters} />}
          <div className="chart-card">
            <div className="chart-title">월별 상세 현황</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>연월</th><th>총 매출</th>
                  {hasOpData && <><th>고객수</th><th>영수단가</th></>}
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => {
                  const opMonth = opData.filter((d) => {
                    const yMatch = !filters.year || d.year === filters.year;
                    const sMatch = !filters.stores?.length || filters.stores.includes(d.store);
                    return d.year === m.year && d.month === m.month && sMatch && yMatch;
                  });
                  const guests = opMonth.reduce((a, d) => a + d.dailyOp.reduce((b, day) => b + day.guests, 0), 0);
                  const tx = opMonth.reduce((a, d) => a + d.dailyOp.reduce((b, day) => b + day.txCount, 0), 0);
                  return (
                    <tr key={m.yearMonth}>
                      <td>{m.yearMonth}</td>
                      <td className="td-num">{formatKRW(m.totalSales)}원</td>
                      {hasOpData && (
                        <>
                          <td className="td-num">{formatKRW(guests)}명</td>
                          <td className="td-num">{formatKRW(Math.round(tx > 0 ? m.totalSales / tx : 0))}원</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'opinfo' && (
        <div className="tab-content">
          <OpInfoUpload onDataLoaded={handleOpDataLoaded} existingCount={opData.length} />
          {hasOpData && <OpInfoSummary opData={filteredOpData} />}
        </div>
      )}

      {activeTab === 'pmix' && <PMix allData={allData} filters={filters} />}
      {activeTab === 'daily' && <DailyTrend allData={allData} filters={filters} />}
      {activeTab === 'yoy' && <YoY allData={allData} />}

      {activeTab === 'upload' && (
        <div className="tab-content">
          <div className="chart-card">
            <div className="chart-title">이지포스 파일 추가 업로드</div>
            <FileUpload onDataLoaded={handleDataLoaded} existingCount={allData.length} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 헬퍼: 매장별 영업정보 집계 ──────────────────────────
function storeOpChart(storeData, filteredOpData) {
  return storeData.map((s) => {
    const op = filteredOpData.filter((d) => d.store === s.store);
    const guests = op.reduce((a, d) => a + d.dailyOp.reduce((b, day) => b + day.guests, 0), 0);
    const tx = op.reduce((a, d) => a + d.dailyOp.reduce((b, day) => b + day.txCount, 0), 0);
    return {
      store: s.store,
      guests,
      txCount: tx,
      avgPerTx: tx > 0 ? s.totalSales / tx : 0,
      avgPerGuest: guests > 0 ? s.totalSales / guests : 0,
    };
  });
}

// ─── 월별 고객수 추이 차트 ────────────────────────────────
function MonthlyOpChart({ opData, filters }) {
  const data = useMemo(() => {
    const map = {};
    opData.forEach((d) => {
      if (filters.year && d.year !== filters.year) return;
      if (filters.stores?.length && !filters.stores.includes(d.store)) return;
      const key = `${d.year}-${d.month}`;
      if (!map[key]) map[key] = { yearMonth: key, guests: 0, txCount: 0 };
      d.dailyOp.forEach((day) => {
        map[key].guests += day.guests;
        map[key].txCount += day.txCount;
      });
    });
    return Object.values(map).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }, [opData, filters]);

  return (
    <div className="chart-card">
      <div className="chart-title">월별 고객수 추이</div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v, name) => [
            name === 'guests' ? `${v.toLocaleString()}명` : `${v.toLocaleString()}건`,
            name === 'guests' ? '고객수' : '영수건수'
          ]} />
          <Legend formatter={(v) => v === 'guests' ? '고객수' : '영수건수'} />
          <Line type="monotone" dataKey="guests" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} name="guests" />
          <Line type="monotone" dataKey="txCount" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="txCount" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 영업정보 탭 요약 ──────────────────────────────────────
function OpInfoSummary({ opData }) {
  const storeStats = useMemo(() => {
    const map = {};
    opData.forEach((d) => {
      if (!map[d.store]) map[d.store] = { store: d.store, sales: 0, guests: 0, txCount: 0 };
      d.dailyOp.forEach((day) => {
        map[d.store].sales += day.sales;
        map[d.store].guests += day.guests;
        map[d.store].txCount += day.txCount;
      });
    });
    return Object.values(map).sort((a, b) => b.guests - a.guests);
  }, [opData]);

  const totalGuests = storeStats.reduce((s, d) => s + d.guests, 0);
  const totalTx = storeStats.reduce((s, d) => s + d.txCount, 0);
  const totalSalesOp = storeStats.reduce((s, d) => s + d.sales, 0);

  return (
    <div className="chart-card" style={{ marginTop: 16 }}>
      <div className="chart-title">영업정보 매장별 집계</div>
      <table className="data-table">
        <thead>
          <tr><th>매장</th><th>총 고객수</th><th>영수건수</th><th>영수단가</th><th>객단가</th></tr>
        </thead>
        <tbody>
          {storeStats.map((s) => (
            <tr key={s.store}>
              <td className="td-store">{s.store}</td>
              <td className="td-num">{formatKRW(s.guests)}명</td>
              <td className="td-num">{formatKRW(s.txCount)}건</td>
              <td className="td-num">{s.txCount > 0 ? formatKRW(Math.round(s.sales / s.txCount)) : '-'}원</td>
              <td className="td-num">{s.guests > 0 ? formatKRW(Math.round(s.sales / s.guests)) : '-'}원</td>
            </tr>
          ))}
          <tr className="total-row">
            <td>합계</td>
            <td className="td-num">{formatKRW(totalGuests)}명</td>
            <td className="td-num">{formatKRW(totalTx)}건</td>
            <td className="td-num">{totalTx > 0 ? formatKRW(Math.round(totalSalesOp / totalTx)) : '-'}원</td>
            <td className="td-num">{totalGuests > 0 ? formatKRW(Math.round(totalSalesOp / totalGuests)) : '-'}원</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── KPI 카드 ─────────────────────────────────────────────
function KpiCard({ label, value, sub, color, badge }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color, fontSize: badge ? 18 : undefined }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}
                                                                                                                                                                                                                                                                                                                                                                                                                             