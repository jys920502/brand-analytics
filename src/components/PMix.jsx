import { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { filterData, formatKRW, formatShort } from '../utils/calcMetrics';
import './PMix.css';

const CAT_COLORS = {
  'Food': '#0d2258',
  'Alcoholic Beverage': '#1d4ed8',
  'Non-Alcoholic Beverage': '#0f766e',
  'Merchandise': '#7c3aed',
  'Gift Card': '#b45309',
  '기타': '#6b7280',
};

export default function PMix({ allData, filters }) {
  const [sortBy, setSortBy] = useState('sales'); // sales | qty
  const [selectedCat, setSelectedCat] = useState('전체');

  // 필터 적용 후 상품 데이터 집계
  const { catData, productData, categories } = useMemo(() => {
    const filtered = filterData(allData, filters);

    // 상품코드 기준으로 집계
    const productMap = {};
    filtered.forEach((file) => {
      file.products.forEach((p) => {
        if (!productMap[p.code]) {
          productMap[p.code] = {
            code: p.code,
            name: p.name,
            midCat: p.midCat,
            subCat: p.subCat,
            totalQty: 0,
            totalSales: 0,
          };
        }
        productMap[p.code].totalQty += p.totalQty;
        productMap[p.code].totalSales += p.totalSales;
      });
    });

    const products = Object.values(productMap).filter((p) => p.totalSales > 0);
    const totalSales = products.reduce((s, p) => s + p.totalSales, 0);

    // 중분류(카테고리) 집계
    const catMap = {};
    products.forEach((p) => {
      const cat = p.midCat || '기타';
      if (!catMap[cat]) catMap[cat] = { name: cat, sales: 0, qty: 0 };
      catMap[cat].sales += p.totalSales;
      catMap[cat].qty += p.totalQty;
    });

    const catData = Object.values(catMap)
      .map((c) => ({ ...c, ratio: totalSales > 0 ? (c.sales / totalSales) * 100 : 0 }))
      .sort((a, b) => b.sales - a.sales);

    const categories = ['전체', ...catData.map((c) => c.name)];

    return { catData, productData: products, categories };
  }, [allData, filters]);

  // 카테고리 필터 + 정렬 적용
  const displayProducts = useMemo(() => {
    let list = selectedCat === '전체'
      ? productData
      : productData.filter((p) => p.midCat === selectedCat);

    const totalSales = productData.reduce((s, p) => s + p.totalSales, 0);

    return list
      .sort((a, b) => sortBy === 'sales' ? b.totalSales - a.totalSales : b.totalQty - a.totalQty)
      .slice(0, 30)
      .map((p, i) => ({
        ...p,
        rank: i + 1,
        ratio: totalSales > 0 ? (p.totalSales / totalSales) * 100 : 0,
      }));
  }, [productData, selectedCat, sortBy]);

  if (allData.length === 0) {
    return <div className="pmix-empty">파일을 먼저 업로드해주세요.</div>;
  }

  const totalSales = catData.reduce((s, c) => s + c.sales, 0);

  return (
    <div className="pmix">
      {/* 카테고리 도넛 차트 */}
      <div className="chart-grid-2">
        <div className="chart-card">
          <div className="chart-title">카테고리별 매출 구성비</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={catData}
                dataKey="sales"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
                label={({ name, ratio }) => `${ratio.toFixed(1)}%`}
                labelLine={false}
              >
                {catData.map((entry) => (
                  <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '매출']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-title">카테고리별 매출 상세</div>
          <table className="data-table">
            <thead>
              <tr><th>카테고리</th><th>매출</th><th>구성비</th><th>수량</th></tr>
            </thead>
            <tbody>
              {catData.map((c) => (
                <tr key={c.name}>
                  <td className="td-store" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLORS[c.name] || '#9ca3af', display: 'inline-block', flexShrink: 0 }} />
                    {c.name}
                  </td>
                  <td className="td-num">{formatKRW(c.sales)}원</td>
                  <td className="td-num">{c.ratio.toFixed(1)}%</td>
                  <td className="td-num">{formatKRW(c.qty)}개</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>합계</td>
                <td className="td-num">{formatKRW(totalSales)}원</td>
                <td className="td-num">100%</td>
                <td className="td-num">{formatKRW(catData.reduce((s, c) => s + c.qty, 0))}개</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 카테고리별 매출 바 차트 */}
      <div className="chart-card">
        <div className="chart-title">카테고리별 매출 비교</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={catData} layout="vertical" margin={{ top: 5, right: 30, left: 140, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={formatShort} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={130} />
            <Tooltip formatter={(v) => [`${formatKRW(v)}원`, '매출']} />
            <Bar dataKey="sales" radius={[0, 4, 4, 0]} name="매출">
              {catData.map((entry) => (
                <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#9ca3af'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 상품 랭킹 */}
      <div className="chart-card">
        <div className="pmix-toolbar">
          <div className="chart-title" style={{ margin: 0 }}>상품별 랭킹 (TOP 30)</div>
          <div className="pmix-controls">
            <div className="cat-btns">
              {categories.map((c) => (
                <button
                  key={c}
                  className={`filter-btn ${selectedCat === c ? 'active' : ''}`}
                  onClick={() => setSelectedCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="sort-toggle">
              <button className={`sort-btn ${sortBy === 'sales' ? 'active' : ''}`} onClick={() => setSortBy('sales')}>매출순</button>
              <button className={`sort-btn ${sortBy === 'qty' ? 'active' : ''}`} onClick={() => setSortBy('qty')}>수량순</button>
            </div>
          </div>
        </div>

        <table className="data-table" style={{ marginTop: 16 }}>
          <thead>
            <tr><th>순위</th><th>상품명</th><th>카테고리</th><th>매출</th><th>구성비</th><th>수량</th></tr>
          </thead>
          <tbody>
            {displayProducts.map((p) => (
              <tr key={p.code}>
                <td style={{ color: p.rank <= 3 ? '#dc2626' : '#374151', fontWeight: p.rank <= 3 ? 700 : 400 }}>
                  {p.rank}
                </td>
                <td className="td-store">{p.name}</td>
                <td style={{ fontSize: 11, color: '#6b7280' }}>{p.midCat}</td>
                <td className="td-num">{formatKRW(p.totalSales)}원</td>
                <td className="td-num">{p.ratio.toFixed(1)}%</td>
                <td className="td-num">{formatKRW(p.totalQty)}개</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
