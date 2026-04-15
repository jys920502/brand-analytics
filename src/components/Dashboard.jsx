import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import FileUpload from './FileUpload';
import FilterBar from './FilterBar';
import {
  aggregateByStore, aggregateByMonth, getYears, getStores,
  formatKRW, formatShort,
} from '../utils/calcMetrics';
import './Dashboard.css';

export default function Dashboard() {
  const [allData, setAllData] = useState([]);
  const [filters, setFilters] = useState({ year: '', months: [], stores: [] });
  const [activeTab, setActiveTab] = useState('overview');

  const handleDataLoaded = (newResults) => {
    setAllData((prev) => {
      const map = {};
      [...prev, ...newResults].forEach((d) => { map[d.key] = d; });
      return Object.values(map);
    });
    if (newResults.length > 0 && !filters.year) {
      const years = [...new Set(newResults.map((d) => d.year))].sort();
      setFilters((f) => ({ ...f, year: years[years.length - 1] }));
    }
  };

  const years = useMemo(() => getYears(allData), [allData]);
  const stores = useMemo(() => getStores(allData), [allData]);
  const storeData = useMemo(() => aggregateByStore(allData, filters), [allData, filters]);
  const monthlyData = useMemo(() => aggregateByMonth(allData, filters), [allData, filters]);

  const totalSales = storeData.reduce((s, d) => s + d.totalSales, 0);
  const totalTx = storeData.reduce((s, d) => s + d.totalTxCount, 0);
  const avgPerTx = totalTx > 0 ? totalSales / totalTx : 0;
  const storeSalesChart = [...storeData].sort((a, b) => b.totalSales - a.totalSales);

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
      </div>

      <FilterBar years={years} stores={stores} filters={filters} onFilterChange={setFilters} />

      <div className="kpi-row">
        <KpiCard label="총 매출" value={formatShort(totalSales)} sub={`${formatKRW(totalSales)}원`} color="#0d2258" />
        <KpiCard label="총 영수건수" value={formatKRW(totalTx)} sub="건" color="#1d4ed8" />
        <KpiCard label="영수단가" value={formatKRW(Math.round(avgPerTx))} sub="원/건" color="#7c3aed" />
        <KpiCard label="로드된 파일" value={allData.length} sub="개 (매장×월)" color="#0f766e" />
      </div>

      <div className="tab-bar">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>매장별 비교</button>
        <button className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`} onClick={() => setActiveTab('monthly')}>월별 추이</button>
        <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>파일 추가</button>
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

          <div className="chart-grid-2">
            <div className="chart-card">
              <div className="chart-title">매장별 영수건수</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={storeSalesChart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="store" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v.toLocaleString()}건`, '영수건수']} />
                  <Bar dataKey="totalTxCount" fill="#1d4ed8" radius={[4,4,0,0]} name="영수건수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-title">매장별 영수단가</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={storeSalesChart} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="store" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '영수단가']} />
                  <Bar dataKey="avgSalesPerTx" fill="#7c3aed" radius={[4,4,0,0]} name="영수단가" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-title">매장별 상세 현황</div>
            <table className="data-table">
              <thead>
                <tr><th>매장</th><th>총 매출</th><th>영수건수</th><th>영수단가</th></tr>
              </thead>
              <tbody>
                {storeSalesChart.map((s) => (
                  <tr key={s.store}>
                    <td className="td-store">{s.store}</td>
                    <td className="td-num">{formatKRW(s.totalSales)}원</td>
                    <td className="td-num">{formatKRW(s.totalTxCount)}건</td>
                    <td className="td-num">{formatKRW(Math.round(s.avgSalesPerTx))}원</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>합계</td>
                  <td className="td-num">{formatKRW(totalSales)}원</td>
                  <td className="td-num">{formatKRW(totalTx)}건</td>
                  <td className="td-num">{formatKRW(Math.round(avgPerTx))}원</td>
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
          <div className="chart-card">
            <div className="chart-title">월별 영수건수 추이</div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="yearMonth" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v.toLocaleString()}건`, '영수건수']} />
                <Legend />
                <Line type="monotone" dataKey="totalTxCount" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 4 }} name="영수건수" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <div className="chart-title">월별 상세 현황</div>
            <table className="data-table">
              <thead><tr><th>연월</th><th>총 매출</th><th>영수건수</th></tr></thead>
              <tbody>
                {monthlyData.map((m) => (
                  <tr key={m.yearMonth}>
                    <td>{m.yearMonth}</td>
                    <td className="td-num">{formatKRW(m.totalSales)}원</td>
                    <td className="td-num">{formatKRW(m.totalTxCount)}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="tab-content">
          <div className="chart-card">
            <div className="chart-title">파일 추가 업로드</div>
            <FileUpload onDataLoaded={handleDataLoaded} existingCount={allData.length} />
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTopColor: color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}
