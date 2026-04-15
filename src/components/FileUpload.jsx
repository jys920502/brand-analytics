import { useState, useRef } from 'react';
import { parseMultipleFiles } from '../utils/parseExcel';
import './FileUpload.css';

export default function FileUpload({ onDataLoaded, existingCount }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef();

  const handleFiles = async (files) => {
    const xlsxFiles = Array.from(files).filter(
      (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.XLSX')
    );
    if (xlsxFiles.length === 0) {
      setMessage('❌ xlsx 파일만 업로드 가능합니다.');
      return;
    }
    setLoading(true);
    setMessage(`⏳ ${xlsxFiles.length}개 파일 처리 중...`);
    const { results, errors } = await parseMultipleFiles(xlsxFiles);
    setLoading(false);
    if (errors.length > 0) setMessage(`⚠️ ${errors.length}개 오류: ${errors[0]}`);
    if (results.length > 0) {
      onDataLoaded(results);
      setMessage(`✅ ${results.length}개 파일 로드 완료!`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="upload-wrap">
      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <div className="drop-icon">📂</div>
        <div className="drop-title">이지포스 엑셀 파일 업로드</div>
        <div className="drop-sub">파일을 여기에 드래그하거나 클릭해서 선택</div>
        <div className="drop-sub">여러 파일 동시 선택 가능 (매장명-YYYY-MM.xlsx)</div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {message && <div className={`upload-msg ${loading ? 'loading' : ''}`}>{message}</div>}
      {existingCount > 0 && (
        <div className="upload-status">현재 로드된 파일: <strong>{existingCount}개</strong></div>
      )}
    </div>
  );
}
