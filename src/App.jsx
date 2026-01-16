import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from 'react-i18next';
import SmartPlayer from "./components/SmartPlayer";
import ContentModal from "./components/ContentModal";
import LoginOverlay from "./components/LoginOverlay";
import "./App.css";

// === 1. 아이콘 설정 (수민님 요청: 검색만 유지) ===
const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  ),
};

// === 2. 서버 주소 및 리전 매핑 ===
const API_BASE_URL = "https://api.exampleott.click/api/v1"; 
const REGION_MAP = { "KR": "SEOUL EDGE", "US": "OREGON EDGE" };

export default function App() {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  const [userData, setUserData] = useState(null); // ERD users 테이블 연동
  const [isIntro, setIsIntro] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [movies, setMovies] = useState([]);
  const [userRegion, setUserRegion] = useState("DETECTING...");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [theater, setTheater] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const dropdownRef = useRef(null);

  // === 3. 데이터 통합 (서버 데이터 없으면 Mock 사용) ===
  const displayMovies = movies.length > 0 ? movies : [
    { id: 't1', title: 'Formation+ 프리미엄', description: '수민님의 모든 요청이 반영된 최종 버전입니다.', thumbnail_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1200', age_rating: '15+', meta: '2026 • SF' }
  ];

  const nextSlide = useCallback(() => {
    if (displayMovies.length > 0) setCurrentIdx(idx => (idx + 1) % displayMovies.length);
  }, [displayMovies.length]);

  const prevSlide = () => {
    if (displayMovies.length > 0) setCurrentIdx(idx => (idx - 1 + displayMovies.length) % displayMovies.length);
  };

  // === 4. 로그인 및 우회 로직 ===
  const handleBypassLogin = () => {
    localStorage.setItem("accessToken", "bypass_success_token");
    setToken("bypass_success_token");
    window.location.reload(); 
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("accessToken", data.access_token);
        setToken(data.access_token);
        window.location.reload();
      } else { alert("로그인 실패"); }
    } catch (err) { alert("서버 연결 실패 (BYPASS를 사용하세요)"); }
  };

  const handlePlay = async (movie) => {
    if (token === "bypass_success_token") {
      setActiveVideoUrl("https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8");
      setTheater(true); return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/contents/${movie.id}/video-assets/s3/list`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      const hlsFile = data.find(file => file.key.endsWith('.m3u8'));
      setActiveVideoUrl(hlsFile ? hlsFile.url : (data[0]?.url || ""));
      setTheater(true);
    } catch (err) { alert("영상 로드 실패"); }
  };

  // === 5. 초기 데이터 및 이벤트 리스너 ===
  useEffect(() => {
    const introTimer = setTimeout(() => setIsIntro(false), 2000);
    const initializeData = async () => {
      if (!token || token === "bypass_success_token") return;
      try {
        const [contentsRes, userRes] = await Promise.all([
          fetch(`${API_BASE_URL}/contents`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/users/me`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);
        if (contentsRes.ok) setMovies(await contentsRes.json());
        if (userRes.ok) {
          const data = await userRes.json();
          setUserData(data); // ERD users 데이터 연동
          setUserRegion(REGION_MAP[data.region_code] || "GLOBAL EDGE");
        }
      } catch (err) { console.log("데이터 로드 대기"); }
    };
    initializeData();

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsProfileOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener('scroll', () => setIsScrolled(window.scrollY > 50));
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(introTimer);
    };
  }, [token]);

  return (
    <div className="App">
      {!token ? (
        <div className="login-screen-wrapper">
          <LoginOverlay onLogin={handleLogin} />
          <button onClick={handleBypassLogin} style={{ position: "fixed", bottom: "10%", left: "50%", transform: "translateX(-50%)", background: "#e50914", color: "#fff", border: "none", padding: "15px 30px", borderRadius: "4px", cursor: "pointer", zIndex: 10001, fontWeight: "900" }}>
            디자인 확인하기 (BYPASS)
          </button>
        </div>
      ) : (
        <>
          {isIntro && <div className="netflix-intro"><div className="logo-zoom">Formation+</div></div>}
          <header className={`ott-header ${isScrolled ? 'scrolled' : ''}`}>
            {/* 헤더 좌측: 수민님의 청정 로고 배치 */}
            <div className="header-left"><div className="logo" onClick={() => window.scrollTo(0,0)}>Formation+</div></div>
            
            <div className="header-right">
              <div className="search-icon-btn"><Icons.Search /></div>
              <div className="region-tag">{userRegion}</div>
              
              {/* === 넷플릭스 스타일 프로필 드롭다운 === */}
              <div className={`profile-menu-wrapper ${isProfileOpen ? 'open' : ''}`} ref={dropdownRef}>
                <div className="profile-trigger" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                  <div className="profile-icon-box">
                    {userData?.first_name?.charAt(0).toUpperCase() || "S"}
                  </div>
                  <div className="dropdown-arrow"></div>
                </div>

                {isProfileOpen && (
                  <div className="profile-dropdown">
                    <div className="dropdown-item" style={{pointerEvents: 'none', paddingBottom: '0'}}>
                      <strong>{userData?.first_name || "수민"}님</strong>
                      <div style={{fontSize: '0.7rem', color: '#888', marginTop: '4px'}}>{userData?.email}</div>
                    </div>
                    
                    {/* === ERD 기반 상세 정보 표시 === */}
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-info-row">
                        <div><span className="info-label">접속 리전:</span> <span className="info-value">{userRegion}</span></div>
                        <div>
                          <span className="info-label">가입 일시:</span> 
                          <span className="info-value">
                            {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : "2026. 01. 16."}
                          </span>
                        </div>
                    </div>

                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item" onClick={() => {localStorage.removeItem("accessToken"); window.location.reload();}}>
                      Formation+에서 로그아웃
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="container">
            {/* 히어로 슬라이더 */}
            <section className="hero-container">
              <button className="nav-arrow arrow-left" onClick={prevSlide}>〈</button>
              <button className="nav-arrow arrow-right" onClick={nextSlide}>〉</button>
              <div className="hero-slider-wrapper">
                {displayMovies.map((s, idx) => (
                  <div key={s.id} className={`hero-slide ${idx === currentIdx ? 'active' : ''}`} style={{ backgroundImage: `url(${s.thumbnail_url})` }}>
                    <div className="hero-overlay">
                      <div className="hero-content">
                        <h1 className="hero-title">{s.title}</h1>
                        <p className="hero-desc">{s.description}</p>
                        <div className="hero-btns">
                          <button className="play-btn" onClick={() => handlePlay(s)}>▶ {t('play')}</button>
                          <button className="info-btn" onClick={() => setSelectedMovie(s)}>ⓘ {t('info')}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
            {/* 추천 컨텐츠 그리드 */}
            <section className="content-row">
               <h3 className="row-title">{t('recommend_title')}</h3>
               <div className="search-grid">
                  {displayMovies.map(item => (<div key={item.id} className="search-card" style={{ backgroundImage: `url(${item.thumbnail_url})` }} onClick={() => setSelectedMovie(item)}></div>))}
               </div>
            </section>
          </main>
          {selectedMovie && <ContentModal content={selectedMovie} onClose={() => setSelectedMovie(null)} onPlay={() => handlePlay(selectedMovie)} />}
        </>
      )}
    </div>
  );
}
