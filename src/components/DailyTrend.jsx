import { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { filterData, formatKRW, formatShort } from '../utils/calcMetrics';
import './DailyTrend.css';

const STORE_COLORS = [
  '#0d2258','#1d4ed8','#0f766e','#7c3aed','#b45309','#dc2626','#065f46','#831843'
];

export default function DailyTrend({ allData, filters }) {
  const [metric, setMetric] = useState('sales'); // sales | txCount

  // 필터 적용 후 일별 데이터 집계
  const { dailyData, stores } = useMemo(() => {
    const filtered = filterData(allData, filters);
    const stores = [...new Set(filtered.map((d) => d.store))].sort();

    // 날짜별로 집계
    const dayMap = {};
    filtered.forEach((file) => {
      file.dailyTotals.forEach((day) => {
        if (!dayMap[day.date]) dayMap[day.date] = { date: day.date };
        if (!dayMap[day.date][file.store]) {
          dayMap[day.date][file.store] = { sales: 0, txCount: 0 };
        }
        dayMap[day.date][file.store].sales += day.sales;
        dayMap[day.date][file.store].txCount += day.txCount;
        // 전체 합계
        if (!dayMap[day.date]['전체']) dayMap[day.date]['전체'] = { sales: 0, txCount: 0 };
        dayMap[day.date]['전체'].sales += day.sales;
        dayMap[day.date]['전체'].txCount += day.txCount;
      });
    });

    // 차트용 flat 데이터 변환
    const dailyData = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, storeValues]) => {
        const row = { date: date.slice(5) }; // MM-DD 형식
        stores.forEach((s) => {
          row[`${s}_sales`] = storeValues[s]?.sales || 0;
          row[`${s}_txCount`] = storeValues[s]?.txCount || 0;
        });
        row['전체_sales'] = storeValues['전체']?.sales || 0;
        row['전체_txCount'] = storeValues['전체']?.txCount || 0;
        return row;
      });

    return { dailyData, stores };
  }, [allData, filters]);

  // 요일별 평균 집계
  const weekdayData = useMemo(() => {
    const filtered = filterData(allData, filters);
    const weekdays = ['일','월','화','수','목','금','토'];
    const wMap = {};
    weekdays.forEach((w) => { wMap[w] = { day: w, sales: 0, txCount: 0, count: 0 }; });

    filtered.forEach((file) => {
      file.dailyTotals.forEach((day) => {
        if (!day.date) return;
        const d = new Date(day.date);
        if (isNaN(d)) return;
        const wd = weekdays[d.getDay()];
        wMap[wd].sales += day.sales;
        wMap[wd].txCount += day.txCount;
        wMap[wd].count += 1;
      });
    });

    return weekdays.map((w) => ({
      day: w,
      avgSales: wMap[w].count > 0 ? wMap[w].sales / wMap[w].count : 0,
      avgTx: wMap[w].count > 0 ? wMap[w].txCount / wMap[w].count : 0,
    }));
  }, [allData, filters]);

  if (allData.length === 0) return <div className="daily-empty">파일을 먼저 업로드해주세요.</div>;

  const isMultiStore = stores.length > 1;

  return (
    <div className="daily-trend">
      {/* 지표 선택 */}
      <div className="metric-toggle">
        <button className={`sort-btn ${metric === 'sales' ? 'active' : ''}`} onClick={() => setMetric('sales')}>매출</button>
        <button className={`sort-btn ${metric === 'txCount' ? 'active' : ''}`} onClick={() => setMetric('txCount')}>영수건수</button>
      </div>

      {/* 일별 추이 라인 차트 */}
      <div className="chart-card">
        <div className="chart-title">일별 {metric === 'sales' ? '매출' : '영수건수'} 추이</div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={dailyData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(dailyData.length / 10)} />
            <YAxis tickFormatter={metric === 'sales' ? formatShort : (v) => v.toLocaleString()} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) => [
                metric === 'sales' ? `${formatKRW(v)}원` : `${v.toLocaleString()}건`,
                name.replace(`_${metric}`, '')
              ]}
            />
            <Legend />
            {isMultiStore ? (
              stores.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={`${s}_${metric}`}
                  stroke={STORE_COLORS[i % STORE_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  name={s}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={`전체_${metric}`}
                stroke="#0d2258"
                strokeWidth={2}
                dot={{ r: 3 }}
                name={metric === 'sales' ? '매출' : '영수건수'}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 요일별 평균 */}
      <div className="chart-grid-2">
        <div className="chart-card">
          <div className="chart-title">요일별 평균 매출</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekdayData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 13, fontWeight: 600 }} />
              <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '평균 매출']} />
              <Bar dataKey="avgSales" fill="#0d2258" radius={[4,4,0,0]} name="평균 매출" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">요일별 평균 영수건수</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekdayData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 13, fontWeight: 600 }} />
              <YAxis tickFormatter={(v) => Math.round(v).toLocaleString()} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Math.round(v).toLocaleString()}건`, '평균 영수건수']} />
              <Bar dataKey="avgTx" fill="#1d4ed8" radius={[4,4,0,0]} name="평균 영수건수" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 일별 상세 테이블 */}
      <div className="chart-card">
        <div className="chart-title">일별 상세 데이터</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>날짜</th>
                {isMultiStore
                  ? stores.map((s) => <th key={s}>{s}</th>)
                  : <th>매출</th>}
                <th>합계</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  {isMultiStore
                    ? stores.map((s) => (
                        <td key={s} className="td-num">
                          {metric === 'sales'
                            ? `${formatKRW(d[`${s}_sales`])}원`
                            : `${(d[`${s}_txCount`] || 0).toLocaleString()}건`}
                        </td>
                      ))
                    : <td className="td-num">
                        {metric === 'sales'
                          ? `${formatKRW(d['전체_sales'])}원`
                          : `${(d['전체_txCount'] || 0).toLocaleString()}건`}
                      </td>}
                  <td className="td-num" style={{ fontWeight: 600 }}>
                    {metric === 'sales'
                      ? `${formatKRW(d['전체_sales'])}원`
                      : `${(d['전체_txCount'] || 0).toLocaleString()}건`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
