import { useState, useRef } from 'react';
import { parseMultipleOpInfoFiles } from '../utils/parseOpInfo';
import './FileUpload.css'; // 동일 스타일 재사용

export default function OpInfoUpload({ onDataLoaded, existingCount }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef();
  const folderRef = useRef();

  const handleFiles = async (files) => {
    const xlsFiles = Array.from(files).filter(
      (f) => f.name.match(/\.xls$/i) && !f.name.match(/\.xlsx$/i)
    );
    if (xlsFiles.length === 0) {
      setMessage('❌ .xls 파일(영업정보)을 찾을 수 없습니다.');
      return;
    }
    setLoading(true);
    setMessage(`⏳ ${xlsFiles.length}개 파일 처리 중...`);
    const { results, errors } = await parseMultipleOpInfoFiles(xlsFiles);
    setLoading(false);

    if (errors.length > 0) setMessage(`⚠️ ${errors.length}개 오류 / ${results.length}건 성공`);
    if (results.length > 0) {
      onDataLoaded(results);
      setMessage(`✅ ${results.length}건 로드 완료! (${xlsFiles.length}개 파일)`);
    } else if (errors.length > 0) {
      setMessage(`❌ 파싱 실패: ${errors[0]}`);
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
      >
        <div className="drop-icon">📋</div>
        <div className="drop-title">영업정보 업로드 (.xls)</div>
        <div className="drop-sub">고객수·영수건수·영수단가가 포함된 영업정보 파일</div>
        <div className="drop-sub" style={{ color: '#9ca3af', marginTop: 4 }}>파일명 형식: YYYY-MM.xls (예: 2026-01.xls)</div>
        <div className="upload-btn-row">
          <button className="upload-btn" onClick={() => fileRef.current.click()}>
            📄 파일 선택
          </button>
          <button className="upload-btn" onClick={() => folderRef.current.click()}>
            📁 폴더 선택
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xls"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={folderRef}
          type="file"
          accept=".xls"
          multiple
          webkitdirectory=""
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {message && <div className={`upload-msg ${loading ? 'loading' : ''}`}>{message}</div>}
      {existingCount > 0 && (
        <div className="upload-status">현재 로드된 영업정보: <strong>{existingCount}건</strong></div>
      )}
    </div>
  );
}
