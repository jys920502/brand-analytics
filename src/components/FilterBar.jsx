import './FilterBar.css';

const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

export default function FilterBar({ years, stores, filters, onFilterChange }) {
  const handleYear = (year) => onFilterChange({ ...filters, year });
  const handleStore = (store) => {
    const cur = filters.stores || [];
    const next = cur.includes(store) ? cur.filter((s) => s !== store) : [...cur, store];
    onFilterChange({ ...filters, stores: next });
  };
  const handleMonth = (month) => {
    const cur = filters.months || [];
    const next = cur.includes(month) ? cur.filter((m) => m !== month) : [...cur, month];
    onFilterChange({ ...filters, months: next });
  };

  return (
    <div className="filterbar">
      <div className="filter-group">
        <div className="filter-label">연도</div>
        <div className="filter-btns">
          {years.map((y) => (
            <button key={y} className={`filter-btn ${filters.year === y ? 'active' : ''}`} onClick={() => handleYear(y)}>
              {y}년
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <div className="filter-label">월</div>
        <div className="filter-btns">
          <button className={`filter-btn ${!filters.months?.length ? 'active' : ''}`} onClick={() => onFilterChange({ ...filters, months: [] })}>전체</button>
          {MONTHS.map((m) => (
            <button key={m} className={`filter-btn ${filters.months?.includes(m) ? 'active' : ''}`} onClick={() => handleMonth(m)}>
              {parseInt(m)}월
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <div className="filter-label">매장</div>
        <div className="filter-btns">
          <button className={`filter-btn ${!filters.stores?.length ? 'active' : ''}`} onClick={() => onFilterChange({ ...filters, stores: [] })}>전체</button>
          {stores.map((s) => (
            <button key={s} className={`filter-btn ${filters.stores?.includes(s) ? 'active' : ''}`} onClick={() => handleStore(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
