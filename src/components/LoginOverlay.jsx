import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import "./LoginOverlay.css";

// [명세서 반영] 프로덕션 API 주소
const API_BASE_URL = "https://api.formationp.com/api/v1"; 

export default function LoginOverlay({ onLogin, isLoading, onBypass }) {
  const { i18n } = useTranslation();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      // localStorage에 회원가입 정보 저장 (한국식: 성 이름)
      const userData = {
        email,
        password,
        firstName,
        lastName,
        fullName: `${lastName}${firstName}`.trim() || email, // 한국식: 성 이름
        registeredAt: new Date().toISOString()
      };
      
      // 기존 사용자 목록 가져오기 (없으면 빈 배열)
      const existingUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      
      // 이미 가입된 이메일인지 확인
      const existingUser = existingUsers.find(u => u.email === email);
      if (existingUser) {
        alert("이미 가입된 이메일입니다. 로그인해주세요.");
        setIsRegisterMode(false);
        setFirstName("");
        setLastName("");
        setIsSubmitting(false);
        return;
      }
      
      // 새 사용자 추가
      existingUsers.push(userData);
      localStorage.setItem("registeredUsers", JSON.stringify(existingUsers));
      
      // 환영 인사 표시
      const fullName = userData.fullName;
      alert(`환영합니다, ${fullName}님! 🎉\n\n회원가입이 완료되었습니다. 로그인해주세요.`);
      
      // 회원가입 후 언어를 한국어로 설정
      i18n.changeLanguage('ko');
      localStorage.setItem('i18nextLng', 'ko');
      
      // 로그인 모드로 전환
      setIsRegisterMode(false);
      
      // 입력 필드 초기화 (이메일과 비밀번호는 유지)
      setFirstName("");
      setLastName("");
    } catch (err) {
      alert("오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRegisterMode) {
      if (!email || !password || !firstName || !lastName) {
        alert("모든 필드를 입력해주세요.");
        return;
      }
      handleRegister();
    } else {
      onLogin(email, password);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-container">
        <div className="login-logo-wrapper">
          <img 
            src="/logo.png" 
            alt="Formation+" 
            className="login-logo-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="login-logo-icon" style={{ display: 'none' }}>
            <div className="logo-play"></div>
          </div>
          <h1 className="login-service-name">Formation+</h1>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>{isRegisterMode ? "회원가입" : "로그인"}</h2>
          
          {isRegisterMode && (
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input type="text" placeholder="성(Last Name)" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              <input type="text" placeholder="이름(First Name)" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
          )}

          <input type="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required />
          
          <button type="submit" disabled={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? "처리 중..." : (isRegisterMode ? "지금 가입하기" : "로그인")}
          </button>
        </form>
        
        <div className="login-help">
          <p>{isRegisterMode ? "이미 회원이신가요?" : "계정이 없으신가요?"}</p>
          <p className="signup-link" onClick={() => { setIsRegisterMode(!isRegisterMode); setFirstName(""); setLastName(""); }} style={{ textDecoration: 'underline', cursor: 'pointer' }}>
            {isRegisterMode ? "로그인하러 가기" : "지금 가입하세요."}
          </p>
        </div>
      </div>
    </div>
  );
}
