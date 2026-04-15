import { useState } from 'react';
import './Login.css';

const PASSWORD = 'pfchang2024'; // ← 비밀번호 여기서 변경 가능

export default function Login({ onLogin }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pw === PASSWORD) {
      onLogin();
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      setPw('');
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">PF Chang's</div>
        <div className="login-title">브랜드 매출 분석 대시보드</div>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(''); }}
            className="login-input"
            autoFocus
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn">로그인</button>
        </form>
        <div className="login-hint">본사 담당자 전용 시스템</div>
      </div>
    </div>
  );
}
