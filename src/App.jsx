import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from 'react-i18next';
import SmartPlayer from "./components/SmartPlayer";
import ContentModal from "./components/ContentModal";
import LoginOverlay from "./components/LoginOverlay";
import "./App.css";

// === 1. 아이콘 설정 (수민님 디자인 유지) ===
const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  ),
};

const API_BASE_URL = "https://api.formationp.com/api/v1";
const REGION_MAP = { "KR": "SEOUL EDGE", "US": "OREGON EDGE" };
const CLOUDFRONT_DOMAIN = "https://site.formationp.com"; // CloudFront 도메인

export default function App() {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState(localStorage.getItem("accessToken"));
  const [userData, setUserData] = useState(null); 
  const [movies, setMovies] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]); // 시청 기록 데이터
  const [isIntro, setIsIntro] = useState(true); // 초기값 true로 복원
  const hasShownIntroRef = useRef(false); // 인트로를 이미 표시했는지 추적
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userRegion, setUserRegion] = useState("DETECTING...");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [theater, setTheater] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [likedContents, setLikedContents] = useState(new Set()); // 좋아요한 콘텐츠 ID 추적
  const [isSearchMode, setIsSearchMode] = useState(false); // 검색 모드
  const [searchQuery, setSearchQuery] = useState(''); // 검색어
  const [searchResults, setSearchResults] = useState([]); // 검색 결과
  const [isSearching, setIsSearching] = useState(false); // 검색 중 상태
  const [isLanguageOpen, setIsLanguageOpen] = useState(false); // 언어 선택 드롭다운 열림 상태
  const [isComposing, setIsComposing] = useState(false); // IME 조합 중 상태
  const dropdownRef = useRef(null);
  const languageDropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const displayMovies = movies.length > 0 ? movies : [
    { 
      id: 't1', 
      title: '우리 생애 최고의 순간', 
      description: '국가대표 여자핸드볼 팀의 화려한 부활을 위해 과거 영광의 주역이었던 선수들이 한데 모인다. 개성 강한 선수들은 서로 싸우며 불화를 일으키는 등, 단합에 어려움을 겪는다. 우여곡절 끝에 각자의 복잡한 인생의 사정을 안고 있는 선수들은 서로를 받아들이고, 끈끈한 팀워크로 뭉치기 시작한다.', 
      thumbnail_url: '/thumbnails/우리 생애 최고의 순간.jpg', 
      age_rating: '전체관람가', 
      meta: '2008년 ‧ 스포츠/드라마 ‧ 2시간 4분',
      meta_display: '전체관람가 | 2008년 ‧ 스포츠/드라마 ‧ 2시간 4분',
      like_count: 0
    },
    { 
      id: 't2', 
      title: '우리들의 일그러진 영웅', 
      description: '40대가 된 한병태는 은사님의 부고 소식을 듣는다. 어린 시절 급장을 맡았던 엄석대가 상갓집에 온다는 소식에 30년 전 작은 교실에서 부조리한 권력을 느꼈던 과거를 회상한다.', 
      thumbnail_url: '/thumbnails/우리들의 일그러진 영웅.jpg', 
      age_rating: '전체관람가', 
      meta: '1992년 ‧ 드라마 ‧ 1시간 58분',
      meta_display: '전체관람가+ | 1992년 ‧ 드라마 ‧ 1시간 58분 | 120 minutes',
      like_count: 0
    },
    { 
      id: 't3', 
      title: '우리들의 행복한 시간', 
      description: '오분순삭 모음집, 무한도전 다시 보기 => 유정은 세 번째 자살 시도 이후 고모 모니카 수녀와 함께 봉사활동으로 구치소로 가게 된다. 그 곳에서 모니카 수녀와 자신을 매몰차게 밀어내는 사형수 정윤수를 만나게 되고, 정윤수는 유정이 어릴 적 애국가를 불렀던 가수였음을 알게 된다.', 
      thumbnail_url: '/thumbnails/우리들의 행복한 시간.jpg', 
      age_rating: '15세이상', 
      meta: '2006년 ‧ 로맨스/드라마 ‧ 2시간',
      meta_display: '15세 이상 관람가 | 2006년 ‧ 로맨스/드라마 ‧ 2시간',
      like_count: 0
    }
  ];

  // === localStorage에서 회원가입 정보 로드 ===
  useEffect(() => {
    if (token && !userData) {
      const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (currentUser) {
        console.log(`[UserData] localStorage에서 사용자 정보 로드:`, currentUser);
        const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
        const registeredUser = registeredUsers.find(u => u.email === currentUser.email);
        
        // 한국식 이름 순서: 성 이름
        const fullName = currentUser.fullName || registeredUser?.fullName;
        let firstName = currentUser.firstName || registeredUser?.firstName || "";
        let lastName = currentUser.lastName || registeredUser?.lastName || "";
        
        // fullName이 있으면 파싱 (예: "정유희" -> lastName="정", firstName="유희")
        if (fullName && !firstName && !lastName) {
          // 한글 이름은 보통 2-4자, 성은 1자
          if (fullName.length >= 2) {
            lastName = fullName.charAt(0);
            firstName = fullName.substring(1);
          }
        }
        
        setUserData({
          first_name: firstName,
          last_name: lastName,
          firstName: firstName,
          lastName: lastName,
          email: currentUser.email,
          fullName: fullName || `${lastName}${firstName}`.trim(),
          created_at: registeredUser?.registeredAt || currentUser.registeredAt || new Date().toISOString()
        });
      }
    }
  }, [token, userData]);

  // === 토큰 만료 체크 및 처리 ===
  const handleTokenExpired = () => {
    console.warn("[Token] 토큰이 만료되었습니다. 로그아웃 처리합니다.");
    localStorage.removeItem("accessToken");
    setToken(null);
    alert("세션이 만료되었습니다. 다시 로그인해주세요.");
    window.location.reload();
  };

  // === API 응답에서 토큰 만료 체크 ===
  const checkTokenExpired = async (response) => {
    if (response.status === 401) {
      const errorText = await response.text();
      if (errorText.includes("expired") || errorText.includes("Invalid token") || errorText.includes("Signature has expired")) {
        handleTokenExpired();
        return true;
      }
    }
    return false;
  };

  // === 데이터 초기화 (백엔드 API 없이 하드코딩된 데이터만 사용) ===
  const initializeData = useCallback(() => {
    console.log(`[Initialize] 백엔드 API 없이 하드코딩된 데이터 사용`);
    
    // localStorage에서 좋아요 정보 로드
    const likedContentsArray = JSON.parse(localStorage.getItem("likedContents") || "[]");
    const likedContentsSet = new Set(likedContentsArray);
    setLikedContents(likedContentsSet);
    
    // localStorage에서 사용자 정보 로드
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (currentUser) {
      console.log(`[Initialize] localStorage에서 사용자 정보 로드:`, currentUser);
      setUserData({
        first_name: currentUser.firstName || currentUser.fullName?.split(" ")[0] || "",
        last_name: currentUser.lastName || currentUser.fullName?.split(" ")[1] || "",
        email: currentUser.email,
        fullName: currentUser.fullName,
        created_at: currentUser.registeredAt || new Date().toISOString()
      });
    }
    
    // 하드코딩된 영화 목록 사용 (displayMovies)
    const contentLikes = JSON.parse(localStorage.getItem("contentLikes") || "{}");
    
    const updatedMovies = displayMovies.map(m => {
      const likeCount = contentLikes[m.id] !== undefined ? contentLikes[m.id] : (m.like_count || 0);
      return {
        ...m,
        is_liked: likedContentsSet.has(m.id),
        like_count: likeCount
      };
    });
    
    console.log(`[Initialize] 하드코딩된 영화 목록 로드:`, updatedMovies.length, "개");
    setMovies(updatedMovies);
  }, []);

  // === [기능 추가] 좋아요 프론트엔드 처리 (localStorage 사용) ===
  const handleToggleLike = (movie) => {
    if (!movie || !movie.id) {
      console.error("[Like] 유효하지 않은 영화 정보");
      return;
    }
    
    try {
      // localStorage에서 좋아요 정보 가져오기
      const likedContentsArray = JSON.parse(localStorage.getItem("likedContents") || "[]");
      const likedContentsSet = new Set(likedContentsArray);
      const contentLikes = JSON.parse(localStorage.getItem("contentLikes") || "{}");
      
      const isCurrentlyLiked = likedContentsSet.has(movie.id);
      const currentLikeCount = contentLikes[movie.id] !== undefined ? contentLikes[movie.id] : (movie.like_count || 0);
      
      // 좋아요 토글
      if (isCurrentlyLiked) {
        // 좋아요 취소
        likedContentsSet.delete(movie.id);
        const newLikeCount = Math.max(currentLikeCount - 1, 0);
        contentLikes[movie.id] = newLikeCount;
        
        console.log(`[Like] ✅ 좋아요 취소: content_id=${movie.id}, count=${newLikeCount}`);
      } else {
        // 좋아요 추가
        likedContentsSet.add(movie.id);
        const newLikeCount = currentLikeCount + 1;
        contentLikes[movie.id] = newLikeCount;
        
        console.log(`[Like] ✅ 좋아요 추가: content_id=${movie.id}, count=${newLikeCount}`);
      }
      
      // localStorage에 저장
      localStorage.setItem("likedContents", JSON.stringify(Array.from(likedContentsSet)));
      localStorage.setItem("contentLikes", JSON.stringify(contentLikes));
      
      // 로컬 상태 업데이트 (즉시 UI 반영)
      setLikedContents(likedContentsSet);
      
      // selectedMovie 업데이트
      if (selectedMovie && selectedMovie.id === movie.id) {
        setSelectedMovie(prev => ({
          ...prev,
          is_liked: !isCurrentlyLiked,
          like_count: contentLikes[movie.id]
        }));
      }
      
      // movies 배열 업데이트
      setMovies(prev => prev.map(m => 
        m.id === movie.id 
          ? { ...m, is_liked: !isCurrentlyLiked, like_count: contentLikes[movie.id] }
          : m
      ));
      
    } catch (err) {
      console.error("[Like] 좋아요 처리 실패:", err);
      alert("좋아요 처리 중 오류가 발생했습니다.");
    }
  };

  // === [기능 추가] 시청 기록 저장 로직 ===
  const saveWatchProgress = async (contentId, time) => {
    try {
      console.log(`[WatchHistory] 시청 기록 저장 시도: contentId=${contentId}, time=${time}`);
      const response = await fetch(`${API_BASE_URL}/watch-history`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content_id: contentId, last_played_time: time })
      });
      
      if (response.ok) {
        console.log(`[WatchHistory] 시청 기록 저장 성공`);
        // 시청 기록 저장 후 로컬 상태 업데이트
        setWatchHistory(prev => {
          const existing = prev.find(h => h.content_id === contentId);
          if (existing) {
            // 기존 기록 업데이트
            return prev.map(h => 
              h.content_id === contentId 
                ? { ...h, last_played_time: time }
                : h
            );
          } else {
            // 새 기록 추가
            return [...prev, { content_id: contentId, last_played_time: time }];
          }
        });
      } else {
        console.error(`[WatchHistory] 시청 기록 저장 실패: ${response.status}`);
      }
    } catch (e) { 
      console.error("[WatchHistory] 기록 저장 실패:", e); 
    }
  };

  const nextSlide = useCallback(() => {
    if (displayMovies.length > 0) setCurrentIdx(idx => (idx + 1) % displayMovies.length);
  }, [displayMovies.length]);

  const prevSlide = () => {
    if (displayMovies.length > 0) setCurrentIdx(idx => (idx - 1 + displayMovies.length) % displayMovies.length);
  };

  // 자동 슬라이더 (디즈니 플러스 스타일)
  useEffect(() => {
    // theater 모드나 검색 모드일 때만 자동 슬라이드 중지
    if (theater || isSearchMode) return;
    
    const autoSlideInterval = setInterval(() => {
      nextSlide();
    }, 10000); // 10초마다 자동 슬라이드

    return () => clearInterval(autoSlideInterval);
  }, [theater, isSearchMode, nextSlide]);

  const handleBypassLogin = () => {
    localStorage.setItem("accessToken", "bypass_success_token");
    setToken("bypass_success_token");
    window.location.reload();
  };

  const handleLogin = async (email, password) => {
    try {
      console.log(`[Login] 로그인 시도: ${email}`);
      
      if (!email || !password) {
        alert("이메일과 비밀번호를 입력해주세요.");
        return;
      }
      
      // localStorage에서 회원가입 정보 확인
      const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
      const user = registeredUsers.find(u => u.email === email && u.password === password);
      
      if (user) {
        // 회원가입한 사용자 - 정상 로그인
        console.log(`[Login] 로그인 성공: ${user.fullName}`);
        const token = `mock_token_${Date.now()}_${email}`;
        
        // 사용자 정보도 저장 (프로필 등에서 사용)
        localStorage.setItem("currentUser", JSON.stringify({
          email: user.email,
          fullName: user.fullName,
          firstName: user.firstName,
          lastName: user.lastName,
          registeredAt: user.registeredAt
        }));
        
        localStorage.setItem("accessToken", token);
        setToken(token);
        window.location.reload();
      } else {
        // 회원가입하지 않은 사용자 - 그래도 로그인 허용 (발표용)
        console.log(`[Login] 미가입 사용자지만 로그인 허용: ${email}`);
        const token = `mock_token_${Date.now()}_${email}`;
        
        localStorage.setItem("currentUser", JSON.stringify({
          email: email,
          fullName: email.split("@")[0],
          firstName: email.split("@")[0],
          lastName: ""
        }));
        
        localStorage.setItem("accessToken", token);
        setToken(token);
        window.location.reload();
      }
    } catch (err) { 
      console.error("[Login] 로그인 중 오류:", err);
      alert(`오류가 발생했습니다: ${err.message}`); 
    }
  };

  // === 백엔드 API 없이 바로 영상 재생 ===
  const handlePlay = (movie) => {
    console.log(`[Video] ========== handlePlay 호출됨 (백엔드 API 없음) ==========`);
    console.log(`[Video] movie:`, movie);
    
    if (!movie || !movie.title) {
      console.error("[Video] 유효하지 않은 영화 정보", movie);
      alert("영화 정보가 올바르지 않습니다.");
      return;
    }

    // ContentModal 닫기 및 검색 모드 종료
    setIsSearchMode(false);
    setSearchQuery('');
    setSearchResults([]);
    
    // 제목 기반 영상 URL 매핑 (백엔드 API 없이 직접 매핑)
    const titleVideoMapping = {
      '테스트 영화': 'https://site.formationp.com/videos/movies/우리들의_일그러진_영웅.mp4',
      '우리들의 일그러진 영웅': 'https://site.formationp.com/videos/movies/우리들의_일그러진_영웅.mp4',
      '우리들의 행복한 시간': 'https://site.formationp.com/videos/movies/우리들의_행복한_시간.mp4',
      '우리 생애 최고의 순간': 'https://site.formationp.com/videos/movies/우리들의_일그러진_영웅.mp4', // 기본 영상
      '테스트': 'https://site.formationp.com/무한도전.mp4',
      '검색 테스트 영화': 'https://site.formationp.com/327101_tiny.mp4',
      'tiny': 'https://site.formationp.com/327101_tiny.mp4',
      '무한도전': 'https://site.formationp.com/무한도전.mp4',
      'Formation+ 프리미엄': 'https://site.formationp.com/videos/movies/우리들의_일그러진_영웅.mp4' // 호환성 유지
    };
    
    // 제목으로 URL 찾기
    const videoUrl = titleVideoMapping[movie.title] || movie.video_url;
    
    if (!videoUrl) {
      console.warn(`[Video] 영상 URL을 찾을 수 없습니다:`, movie.title);
      alert(`"${movie.title}"에 대한 영상 URL을 찾을 수 없습니다.`);
      return;
    }
    
    console.log(`[Video] 영상 재생 시작: ${videoUrl}`);
    
    // 바로 영상 재생
    setTheater(true);
    setSelectedMovie(movie);
    setActiveVideoUrl(videoUrl);
    
    console.log(`[Video] ✅ 영상 재생 설정 완료!`);
  };

  // 언어에 따라 제목 다르게 표시
  const getTitle = (title) => {
    if (i18n.language === 'en') {
      if (title === '우리 생애 최고의 순간') {
        return 'Forever the Moment';
      } else if (title === '우리들의 일그러진 영웅') {
        return 'Our Twisted Hero';
      } else if (title === '우리들의 행복한 시간') {
        return 'Our Happy Time';
      } else if (title === '무한도전') {
        return 'Infinite Challenge';
      }
    }
    return title;
  };

  // 한글 자모를 영문 키보드로 변환 (영어 모드일 때)
  const convertKoreanToEnglish = (text) => {
    if (i18n.language !== 'en') return text;
    
    // 한글 키보드 레이아웃에 따른 영문 변환 매핑
    const koreanToEnglish = {
      // 자음
      'ㄱ': 'r', 'ㄲ': 'R', 'ㄴ': 's', 'ㄷ': 'e', 'ㄸ': 'E',
      'ㄹ': 'f', 'ㅁ': 'a', 'ㅂ': 'q', 'ㅃ': 'Q', 'ㅅ': 't',
      'ㅆ': 'T', 'ㅇ': 'd', 'ㅈ': 'w', 'ㅉ': 'W', 'ㅊ': 'c',
      'ㅋ': 'z', 'ㅌ': 'x', 'ㅍ': 'v', 'ㅎ': 'g',
      // 모음
      'ㅏ': 'k', 'ㅐ': 'o', 'ㅑ': 'i', 'ㅒ': 'O',
      'ㅓ': 'j', 'ㅔ': 'p', 'ㅕ': 'u', 'ㅖ': 'P',
      'ㅗ': 'h', 'ㅘ': 'hk', 'ㅙ': 'ho', 'ㅚ': 'hl',
      'ㅛ': 'y', 'ㅜ': 'n', 'ㅝ': 'nj', 'ㅞ': 'np',
      'ㅟ': 'nl', 'ㅠ': 'b', 'ㅡ': 'm', 'ㅢ': 'ml',
      'ㅣ': 'l'
    };
    
    return text.split('').map(char => {
      if (koreanToEnglish[char]) {
        return koreanToEnglish[char];
      }
      // 완성된 한글인 경우 처리하지 않음 (영어 키보드로 변환할 수 없음)
      return char;
    }).join('');
  };

  // 영문 키보드를 한글 자모로 변환 (한국어 모드일 때)
  const convertEnglishToKorean = (text) => {
    if (i18n.language !== 'ko') return text;
    
    // 한글 키보드 레이아웃에 따른 영문 → 한글 자모 변환 매핑
    const englishToKorean = {
      // 자음
      'r': 'ㄱ', 'R': 'ㄲ', 's': 'ㄴ', 'e': 'ㄷ', 'E': 'ㄸ',
      'f': 'ㄹ', 'a': 'ㅁ', 'q': 'ㅂ', 'Q': 'ㅃ', 't': 'ㅅ',
      'T': 'ㅆ', 'd': 'ㅇ', 'w': 'ㅈ', 'W': 'ㅉ', 'c': 'ㅊ',
      'z': 'ㅋ', 'x': 'ㅌ', 'v': 'ㅍ', 'g': 'ㅎ',
      // 모음
      'k': 'ㅏ', 'o': 'ㅐ', 'i': 'ㅑ', 'O': 'ㅒ',
      'j': 'ㅓ', 'p': 'ㅔ', 'u': 'ㅕ', 'P': 'ㅖ',
      'h': 'ㅗ', 'y': 'ㅛ', 'n': 'ㅜ', 'b': 'ㅠ',
      'm': 'ㅡ', 'l': 'ㅣ'
    };
    
    return text.split('').map(char => {
      if (englishToKorean[char]) {
        return englishToKorean[char];
      }
      // 이미 한글이거나 다른 문자인 경우 그대로 유지
      return char;
    }).join('');
  };

  // 검색 기능 - 프론트엔드에서 displayMovies 필터링
  const handleSearch = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchMode(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // displayMovies 배열에서 제목에 검색어가 포함된 항목 찾기 (부분 일치)
      // 언어별로 검색: 영어 모드에서는 영어 제목으로, 한국어 모드에서는 한국어 제목으로 검색
      const searchQuery = query.trim().toLowerCase();
      const filteredResults = displayMovies.filter(movie => {
        // 현재 언어에 맞는 제목으로 검색
        const movieTitle = getTitle(movie.title || '').toLowerCase();
        return movieTitle.includes(searchQuery);
      });
      
      console.log(`[Search] 검색어: "${query}" → 결과: ${filteredResults.length}개`);
      console.log(`[Search] 검색 결과:`, filteredResults.map(m => m.title));
      
      // 좋아요 정보 추가
      const likedContentsArray = JSON.parse(localStorage.getItem("likedContents") || "[]");
      const likedContentsSet = new Set(likedContentsArray);
      const contentLikes = JSON.parse(localStorage.getItem("contentLikes") || "{}");
      
      const resultsWithLikes = filteredResults.map(item => ({
        ...item,
        is_liked: likedContentsSet.has(item.id),
        like_count: contentLikes[item.id] !== undefined ? contentLikes[item.id] : (item.like_count || 0)
      }));
      
      setSearchResults(resultsWithLikes);
      setIsSearchMode(true);
    } catch (error) {
      console.error("[Search] 검색 중 오류:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (!token) {
      // 토큰이 없을 때는 인트로 플래그 리셋
      hasShownIntroRef.current = false;
      return;
    }
    
    // 토큰이 있을 때
    // 인트로를 아직 표시하지 않았을 때만 인트로 표시
    let introTimer;
    if (!hasShownIntroRef.current) {
      hasShownIntroRef.current = true;
      setIsIntro(true);
      introTimer = setTimeout(() => setIsIntro(false), 2000);
    } else {
      // 이미 인트로를 표시한 경우 인트로 표시 안 함
      setIsIntro(false);
    }
    
    initializeData();
    
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsProfileOpen(false);
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(e.target)) setIsLanguageOpen(false);
    };
    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener('scroll', () => setIsScrolled(window.scrollY > 50));
    
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      if (introTimer) clearTimeout(introTimer);
    };
  }, [token]); // initializeData 의존성 제거 (무한 루프 방지)

  // 언어 변경 시 검색 입력창의 IME 모드 자동 설정
  useEffect(() => {
    if (searchInputRef.current && isSearchMode) {
      if (i18n.language === 'en') {
        searchInputRef.current.setAttribute('lang', 'en');
        searchInputRef.current.setAttribute('inputmode', 'latin');
        searchInputRef.current.style.imeMode = 'disabled';
      } else {
        searchInputRef.current.setAttribute('lang', 'ko');
        searchInputRef.current.setAttribute('inputmode', 'text');
        searchInputRef.current.style.imeMode = 'active';
      }
      // IME 모드를 재설정하기 위해 focus/blur (자동으로 영어/한글 모드로 전환)
      if (document.activeElement === searchInputRef.current) {
        searchInputRef.current.blur();
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 50);
      }
    }
  }, [i18n.language, isSearchMode]);

  // 시청 중인 콘텐츠 (중복 제거)
  const continuingMoviesMap = new Map();
  
  // watchHistory를 content_id별로 그룹화하여 가장 최근 것만 선택
  // movies 배열에 없는 content_id는 제외 (필터링된 콘텐츠 등)
  watchHistory.forEach(h => {
    const m = movies.find(mv => mv.id === h.content_id);
    if (m) {
      const existing = continuingMoviesMap.get(h.content_id);
      // 같은 content_id가 없거나, 기존 것보다 더 최근 시간이면 업데이트
      const lastPlayedTime = h.last_played_time || 0;
      if (!existing || ((existing.last_played_time || 0) < lastPlayedTime)) {
        continuingMoviesMap.set(h.content_id, { ...m, last_played_time: lastPlayedTime });
      }
    }
    // movies 배열에 없는 content_id는 무시 (필터링된 콘텐츠 등)
  });
  
  // Map에서 배열로 변환 (content_id로 이미 중복 제거됨)
  let continuingMovies = Array.from(continuingMoviesMap.values());
  
  // 제목 기반 중복 제거 (같은 제목이 여러 개 있는 경우, 가장 최근 것만 유지)
  const titleBasedMap = new Map();
  continuingMovies.forEach(m => {
    const title = m.title || '';
    const existing = titleBasedMap.get(title);
    const lastPlayedTime = m.last_played_time || 0;
    if (!existing || ((existing.last_played_time || 0) < lastPlayedTime)) {
      titleBasedMap.set(title, m);
    }
  });
  continuingMovies = Array.from(titleBasedMap.values());
  
  // last_played_time 기준으로 정렬 (가장 최근 것이 먼저)
  continuingMovies.sort((a, b) => (b.last_played_time || 0) - (a.last_played_time || 0));

  return (
    <div className="App">
      {!token ? (
        <div className="login-screen-wrapper">
          <LoginOverlay onLogin={handleLogin} onBypass={handleBypassLogin} />
        </div>
      ) : (
        <>
          {isIntro && (
            <div className="netflix-intro">
              <div className="logo-zoom">
                <img 
                  src="/logo.png" 
                  alt="Formation+" 
                  className="logo-zoom-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="logo-zoom-icon" style={{ display: 'none' }}>
                  <div className="logo-zoom-play"></div>
                </div>
                <span className="logo-zoom-text">Formation+</span>
              </div>
            </div>
          )}
          <header className={`ott-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="header-left">
              <div className="logo" onClick={() => window.scrollTo(0,0)}>
                <img 
                  src="/logo.png" 
                  alt="Formation+" 
                  className="logo-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div className="logo-icon" style={{ display: 'none' }}>
                  <div className="logo-play"></div>
                </div>
                <span>Formation+</span>
              </div>
            </div>
            <div className="header-right">
              {isSearchMode ? (
                <div className="search-input-wrapper">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-input"
                    lang={i18n.language === 'en' ? 'en' : 'ko'}
                    placeholder={i18n.language === 'en' ? 'Search...' : '검색...'}
                    value={searchQuery}
                    onCompositionStart={() => {
                      // IME 조합 시작
                      setIsComposing(true);
                    }}
                    onCompositionUpdate={(e) => {
                      // IME 조합 중 (한글 입력 중)
                      // 조합 중일 때는 아무것도 하지 않음
                    }}
                    onCompositionEnd={(e) => {
                      // IME 조합 완료 (한글 입력 완료)
                      setIsComposing(false);
                      const value = e.target.value;
                      setSearchQuery(value);
                      // 조합 완료 후에만 검색 실행
                      if (value.trim()) {
                        handleSearch(value);
                      } else {
                        setSearchResults([]);
                        setIsSearchMode(false);
                      }
                    }}
                    onChange={(e) => {
                      let value = e.target.value;
                      
                      // IME 조합 중일 때는 onChange에서 아무것도 하지 않음
                      if (isComposing) {
                        setSearchQuery(value);
                        return;
                      }
                      
                      // 영어 모드일 때만 한글 자모를 영문으로 자동 변환
                      if (i18n.language === 'en') {
                        const converted = convertKoreanToEnglish(value);
                        if (converted !== value) {
                          // 변환된 값으로 업데이트
                          value = converted;
                          // input 값 직접 설정
                          e.target.value = value;
                        }
                      }
                      
                      // 한국어 모드에서는 변환하지 않고 그대로 사용
                      setSearchQuery(value);
                      if (value.trim()) {
                        handleSearch(value);
                      } else {
                        setSearchResults([]);
                        setIsSearchMode(false);
                      }
                    }}
                    onFocus={(e) => {
                      // 언어에 따라 IME 모드 자동 설정
                      if (i18n.language === 'en') {
                        e.target.setAttribute('lang', 'en');
                        e.target.setAttribute('inputmode', 'latin');
                        // 영어 모드일 때 IME 비활성화 (자동으로 영어 입력 모드)
                        e.target.style.imeMode = 'disabled';
                        // 추가: composition 모드 방지
                        setTimeout(() => {
                          if (e.target && document.activeElement === e.target) {
                            // 포커스를 다시 주어 IME 모드 재설정
                            e.target.blur();
                            e.target.focus();
                          }
                        }, 50);
                      } else {
                        e.target.setAttribute('lang', 'ko');
                        e.target.setAttribute('inputmode', 'text');
                        // 한국어 모드일 때 IME 활성화 (자동으로 한글 입력 모드)
                        e.target.style.imeMode = 'active';
                        setIsComposing(false);
                      }
                    }}
                    autoFocus
                  />
                  <button 
                    className="search-close-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setIsSearchMode(false);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="search-icon-btn" onClick={() => {
                  setIsSearchMode(true);
                  // 검색 모드가 열릴 때 언어에 맞게 IME 모드 자동 설정
                  setTimeout(() => {
                    if (searchInputRef.current) {
                      if (i18n.language === 'en') {
                        searchInputRef.current.setAttribute('lang', 'en');
                        searchInputRef.current.setAttribute('inputmode', 'latin');
                        searchInputRef.current.style.imeMode = 'disabled';
                      } else {
                        searchInputRef.current.setAttribute('lang', 'ko');
                        searchInputRef.current.setAttribute('inputmode', 'text');
                        searchInputRef.current.style.imeMode = 'active';
                      }
                      // 포커스를 주어 IME 모드 활성화
                      searchInputRef.current.focus();
                    }
                  }, 100);
                }}>
                  <Icons.Search />
                </div>
              )}
              <div className={`language-selector ${isLanguageOpen ? 'open' : ''}`} ref={languageDropdownRef}>
                <div className="language-trigger" onClick={() => setIsLanguageOpen(!isLanguageOpen)}>
                  <span>{i18n.language === 'ko' ? '한국어' : 'English'}</span>
                  <div className="dropdown-arrow"></div>
                </div>
                {isLanguageOpen && (
                  <div className="language-dropdown">
                    <div 
                      className={`language-option ${i18n.language === 'ko' ? 'active' : ''}`}
                      onClick={() => {
                        i18n.changeLanguage('ko');
                        setIsLanguageOpen(false);
                      }}
                    >
                      한국어
                    </div>
                    <div 
                      className={`language-option ${i18n.language === 'en' ? 'active' : ''}`}
                      onClick={() => {
                        i18n.changeLanguage('en');
                        setIsLanguageOpen(false);
                      }}
                    >
                      English
                    </div>
                  </div>
                )}
              </div>
              <div className={`profile-menu-wrapper ${isProfileOpen ? 'open' : ''}`} ref={dropdownRef}>
                <div className="profile-trigger" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                  {/* 수민님 전용 파란 동그라미 아이콘 유지 */}
                  <div className="profile-icon-box">
                    {userData?.first_name?.charAt(0).toUpperCase() || 
                     userData?.fullName?.charAt(0).toUpperCase() || 
                     userData?.lastName?.charAt(0).toUpperCase() || 
                     "S"}
                  </div>
                  <div className="dropdown-arrow"></div>
                </div>
                {isProfileOpen && (
                  <div className="profile-dropdown">
                    <div className="dropdown-item" style={{pointerEvents: 'none', paddingBottom: '0'}}>
                      <strong>
                        {(() => {
                          // 한국식 이름 순서: 성 이름
                          if (userData?.last_name && userData?.first_name) {
                            return `${userData.last_name}${userData.first_name}님`;
                          }
                          if (userData?.lastName && userData?.firstName) {
                            return `${userData.lastName}${userData.firstName}님`;
                          }
                          if (userData?.fullName) {
                            // fullName이 "유희 정" 형식일 수 있으므로 파싱
                            const parts = userData.fullName.trim().split(/\s+/);
                            if (parts.length === 2) {
                              // "유희 정" -> "정유희"
                              return `${parts[1]}${parts[0]}님`;
                            }
                            // 이미 "정유희" 형식이면 그대로 사용
                            return `${userData.fullName}님`;
                          }
                          if (userData?.first_name) {
                            return `${userData.first_name}님`;
                          }
                          if (userData?.lastName) {
                            return `${userData.lastName}님`;
                          }
                          return '사용자님';
                        })()}
                      </strong>
                      <div style={{fontSize: '0.7rem', color: '#888', marginTop: '4px'}}>{userData?.email || ''}</div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-info-row">
                      <div><span className="info-label">{i18n.language === 'en' ? 'Region:' : '접속 리전:'}</span> <span className="info-value">{userRegion}</span></div>
                      <div>
                        <span className="info-label">{i18n.language === 'en' ? 'Sign-up Date:' : '가입 일시:'}</span>
                        <span className="info-value">
                          {userData?.created_at 
                            ? new Date(userData.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '. ').replace(/\.$/, '.')
                            : (() => {
                                const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
                                const registeredUsers = JSON.parse(localStorage.getItem("registeredUsers") || "[]");
                                const user = registeredUsers.find(u => u.email === currentUser?.email);
                                return user?.registeredAt 
                                  ? new Date(user.registeredAt).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '. ').replace(/\.$/, '.')
                                  : "2026. 01. 16.";
                              })()}
                        </span>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item" onClick={() => {localStorage.removeItem("accessToken"); window.location.reload();}}>{i18n.language === 'en' ? 'Log Out' : 'Formation+에서 로그아웃'}</div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="container">
            {isSearchMode ? (
              <div className="search-results-container">
                {searchQuery && searchResults.length > 0 ? (
                  <>
                    <h2 className="search-section-title">
                      "{searchQuery}" {t('search_results')}
                    </h2>
                    <div className="search-row">
                      <div className="search-row-content">
                        {searchResults.map(item => {
                          const thumbnailUrl = item.thumbnail_url ? encodeURI(item.thumbnail_url) : item.thumbnail_url;
                          return (
                            <div 
                              key={item.id} 
                              className="search-thumbnail" 
                              style={{ backgroundImage: `url(${thumbnailUrl})` }} 
                              onClick={() => setSelectedMovie(item)}
                            >
                              <div className="thumbnail-overlay">
                                <div className="thumbnail-title">{getTitle(item.title)}</div>
                                <div className="thumbnail-like">❤️ {item.like_count || 0}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : searchQuery && !isSearching ? (
                  <div className="search-no-results">
                    <h2 className="search-section-title">"{searchQuery}" {t('search_results')}</h2>
                    <p>{t('no_search_results')}</p>
                  </div>
                ) : !searchQuery ? (
                  <div className="search-empty">
                    <p style={{ color: '#888', fontSize: '1.2rem', textAlign: 'center', padding: '3rem' }}>
                      {i18n.language === 'en' ? 'Search for something...' : '검색어를 입력해주세요'}
                    </p>
                  </div>
                ) : (
                  <div className="search-loading">
                    <p>검색 중...</p>
                  </div>
                )}
              </div>
            ) : theater ? (
              <div className="theater-overlay">
                 <button className="close-theater-btn" onClick={() => setTheater(false)}>✕ 닫기</button>
                 {selectedMovie && activeVideoUrl ? (
                   <SmartPlayer 
                     src={activeVideoUrl} 
                     region={userRegion} 
                     contentData={selectedMovie} 
                     initialTime={watchHistory.find(h => h.content_id === selectedMovie.id)?.last_played_time || 0}
                     onProgressSave={saveWatchProgress}
                   />
                 ) : (
                   <div style={{ padding: '2rem', color: '#fff' }}>
                     <p>비디오를 불러오는 중...</p>
                     {!selectedMovie && <p>콘텐츠 정보가 없습니다.</p>}
                     {!activeVideoUrl && <p>비디오 URL을 불러오는 중...</p>}
                   </div>
                 )}
              </div>
            ) : (
              <>
                <section className="hero-container">
                  <button className="nav-arrow arrow-left" onClick={prevSlide}>〈</button>
                  <button className="nav-arrow arrow-right" onClick={nextSlide}>〉</button>
                  <div className="hero-slider-wrapper">
                    {displayMovies.map((s, idx) => {
                      // 한글 파일명 인코딩 처리
                      const thumbnailUrl = s.thumbnail_url ? encodeURI(s.thumbnail_url) : s.thumbnail_url;
                      return (
                      <div key={s.id} className={`hero-slide ${idx === currentIdx ? 'active' : ''}`} style={{ backgroundImage: `url(${thumbnailUrl})` }}>
                        <div className="hero-overlay">
                          <div className="hero-content">
                            <h1 className="hero-title">{getTitle(s.title)}</h1>
                            <div className="hero-btns">
                              <button 
                                className="play-btn" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log(`[Video] 재생 버튼 클릭:`, s);
                                  handlePlay(s);
                                }}
                              >
                                ▶ {t('play')}
                              </button>
                              <button className="info-btn" onClick={() => setSelectedMovie(s)}>ⓘ {t('info')}</button>
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </section>

                {/* 시청 중인 콘텐츠 */}
                {continuingMovies.length > 0 && (
                  <section className="content-row">
                    <h3 className="row-title">{t('continue_watching')}</h3>
                    <div className="content-row-wrapper">
                      <div className="content-row-content">
                        {continuingMovies.map(movie => (
                          <div 
                            key={`history-${movie.id}`} 
                            className="content-thumbnail" 
                            style={{ backgroundImage: `url(${movie.thumbnail_url})` }} 
                            onClick={() => setSelectedMovie(movie)}
                          >
                            <div className="thumbnail-overlay">
                              <div className="thumbnail-title">{getTitle(movie.title)}</div>
                            </div>
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${Math.min((movie.last_played_time / (movie.duration || 3600)) * 100, 100)}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 추천 콘텐츠 */}
                {movies.length > 0 && (
                  <section className="content-row">
                    <h3 className="row-title">{i18n.language === 'en' ? 'Recommended' : '추천'}</h3>
                    <div className="content-row-wrapper">
                      <div className="content-row-content">
                        {movies.map(item => {
                          const thumbnailUrl = item.thumbnail_url ? encodeURI(item.thumbnail_url) : item.thumbnail_url;
                          return (
                            <div 
                              key={item.id} 
                              className="content-thumbnail" 
                              style={{ backgroundImage: `url(${thumbnailUrl})` }} 
                              onClick={() => setSelectedMovie(item)}
                            >
                              <div className="thumbnail-overlay">
                                <div className="thumbnail-title">{getTitle(item.title)}</div>
                                <div className="thumbnail-like">❤️ {item.like_count || 0}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </main>
          {/* theater 모드가 아닐 때만 ContentModal 표시 */}
          {selectedMovie && !theater && (
            <ContentModal 
              content={{
                ...selectedMovie,
                is_liked: likedContents.has(selectedMovie.id) || selectedMovie.is_liked || false
              }} 
              onClose={() => setSelectedMovie(null)} 
              onPlay={() => handlePlay(selectedMovie)} 
              onLike={() => handleToggleLike(selectedMovie)}
            />
          )}
        </>
      )}
    </div>
  );
}
