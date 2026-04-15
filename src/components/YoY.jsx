import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine
} from 'recharts';
import { formatKRW, formatShort } from '../utils/calcMetrics';
import './YoY.css';

export default function YoY({ allData }) {
  const { monthlyComp, storeComp, years } = useMemo(() => {
    const years = [...new Set(allData.map((d) => d.year))].sort();

    if (years.length < 2) return { monthlyComp: [], storeComp: [], years };

    const curYear = years[years.length - 1];
    const prevYear = years[years.length - 2];

    // 월별 비교 (전체 매장 합계)
    const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const monthlyComp = months.map((m) => {
      const cur = allData.filter((d) => d.year === curYear && d.month === m);
      const prev = allData.filter((d) => d.year === prevYear && d.month === m);
      const curSales = cur.reduce((s, d) => s + d.totalSales, 0);
      const prevSales = prev.reduce((s, d) => s + d.totalSales, 0);
      const curTx = cur.reduce((s, d) => s + d.dailyTotals.reduce((a, b) => a + b.txCount, 0), 0);
      const prevTx = prev.reduce((s, d) => s + d.dailyTotals.reduce((a, b) => a + b.txCount, 0), 0);
      const growth = prevSales > 0 ? ((curSales - prevSales) / prevSales) * 100 : null;

      return {
        month: `${parseInt(m)}월`,
        [curYear]: curSales,
        [prevYear]: prevSales,
        [`${curYear}_tx`]: curTx,
        [`${prevYear}_tx`]: prevTx,
        growth,
        hasCur: curSales > 0,
        hasPrev: prevSales > 0,
      };
    }).filter((d) => d.hasCur || d.hasPrev);

    // 매장별 비교
    const stores = [...new Set(allData.map((d) => d.store))].sort();
    const storeComp = stores.map((store) => {
      const cur = allData.filter((d) => d.store === store && d.year === curYear);
      const prev = allData.filter((d) => d.store === store && d.year === prevYear);
      const curSales = cur.reduce((s, d) => s + d.totalSales, 0);
      const prevSales = prev.reduce((s, d) => s + d.totalSales, 0);
      const growth = prevSales > 0 ? ((curSales - prevSales) / prevSales) * 100 : null;
      return { store, [curYear]: curSales, [prevYear]: prevSales, growth };
    }).filter((d) => d[curYear] > 0 || d[prevYear] > 0);

    return { monthlyComp, storeComp, years };
  }, [allData]);

  if (allData.length === 0) return <div className="yoy-empty">파일을 먼저 업로드해주세요.</div>;

  const curYear = years[years.length - 1];
  const prevYear = years[years.length - 2];

  if (years.length < 2) {
    return (
      <div className="yoy-empty">
        전년 대비 비교를 위해 2개 연도 이상의 데이터가 필요합니다.<br />
        현재 {curYear}년 데이터만 로드되어 있습니다.
      </div>
    );
  }

  const growthColor = (g) => g === null ? '#9ca3af' : g >= 0 ? '#16a34a' : '#dc2626';

  return (
    <div className="yoy">
      {/* 월별 매출 비교 */}
      <div className="chart-card">
        <div className="chart-title">월별 매출 비교 ({prevYear} vs {curYear})</div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthlyComp} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '']} />
            <Legend />
            <Bar dataKey={prevYear} fill="#c8d0d8" radius={[3,3,0,0]} name={`${prevYear}년`} />
            <Bar dataKey={curYear} fill="#0d2258" radius={[3,3,0,0]} name={`${curYear}년`} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 월별 증감률 라인 차트 */}
      <div className="chart-card">
        <div className="chart-title">월별 매출 증감률 (YoY %)</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthlyComp} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v?.toFixed(1)}%`, '증감률']} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="growth"
              stroke="#dc2626"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.growth === null) return null;
                return <circle key={cx} cx={cx} cy={cy} r={5} fill={payload.growth >= 0 ? '#16a34a' : '#dc2626'} />;
              }}
              name="증감률"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 매장별 비교 */}
      <div className="chart-card">
        <div className="chart-title">매장별 매출 비교 ({prevYear} vs {curYear})</div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={storeComp} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="store" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatShort} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '']} />
            <Legend />
            <Bar dataKey={prevYear} fill="#c8d0d8" radius={[3,3,0,0]} name={`${prevYear}년`} />
            <Bar dataKey={curYear} fill="#0d2258" radius={[3,3,0,0]} name={`${curYear}년`} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 상세 비교 테이블 */}
      <div className="chart-card">
        <div className="chart-title">월별 상세 비교</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>월</th>
              <th>{prevYear}년 매출</th>
              <th>{curYear}년 매출</th>
              <th>증감액</th>
              <th>증감률</th>
            </tr>
          </thead>
          <tbody>
            {monthlyComp.map((m) => {
              const diff = (m[curYear] || 0) - (m[prevYear] || 0);
              return (
                <tr key={m.month}>
                  <td style={{ fontWeight: 600 }}>{m.month}</td>
                  <td className="td-num">{formatKRW(m[prevYear])}원</td>
                  <td className="td-num">{formatKRW(m[curYear])}원</td>
                  <td className="td-num" style={{ color: diff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {diff >= 0 ? '+' : ''}{formatKRW(diff)}원
                  </td>
                  <td className="td-num" style={{ color: growthColor(m.growth), fontWeight: 700 }}>
                    {m.growth !== null ? `${m.growth >= 0 ? '+' : ''}${m.growth.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 매장별 상세 테이블 */}
      <div className="chart-card">
        <div className="chart-title">매장별 상세 비교</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>매장</th>
              <th>{prevYear}년</th>
              <th>{curYear}년</th>
              <th>증감액</th>
              <th>증감률</th>
            </tr>
          </thead>
          <tbody>
            {storeComp.map((s) => {
              const diff = (s[curYear] || 0) - (s[prevYear] || 0);
              return (
                <tr key={s.store}>
                  <td className="td-store">{s.store}</td>
                  <td className="td-num">{formatKRW(s[prevYear])}원</td>
                  <td className="td-num">{formatKRW(s[curYear])}원</td>
                  <td className="td-num" style={{ color: diff >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {diff >= 0 ? '+' : ''}{formatKRW(diff)}원
                  </td>
                  <td className="td-num" style={{ color: growthColor(s.growth), fontWeight: 700 }}>
                    {s.growth !== null ? `${s.growth >= 0 ? '+' : ''}${s.growth.toFixed(1)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
