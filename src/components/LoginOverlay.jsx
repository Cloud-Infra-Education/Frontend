import React, { useState } from "react";
import "./LoginOverlay.css";

// [명세서 반영] 프로덕션 API 주소
const API_BASE_URL = "https://api.exampleott.click/api/v1"; 

export default function LoginOverlay({ onLogin, isLoading }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          region_code: "KR",
          subscription_status: "free"
        }),
      });

      if (response.ok) {
        alert("회원가입 성공! 가입하신 계정으로 로그인해 주세요.");
        setIsRegisterMode(false);
      } else {
        const error = await response.json();
        alert(`가입 실패: ${error.detail || "정보를 확인해주세요."}`);
      }
    } catch (err) {
      alert("서버 연결에 실패했습니다.");
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
        <h1 className="login-logo">Formation+</h1>
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
