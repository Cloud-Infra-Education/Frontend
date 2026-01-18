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
const CLOUDFRONT_DOMAIN = "https://www.formationp.com"; // CloudFront 도메인

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
  const dropdownRef = useRef(null);
  const languageDropdownRef = useRef(null);

  const displayMovies = movies.length > 0 ? movies : [
    { id: 't1', title: 'Formation+ 프리미엄', description: '수민님의 모든 요청이 반영된 최종 버전입니다.', thumbnail_url: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1200', age_rating: '15+', meta: '2026 • SF' }
  ];

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

  // === [기능 추가] 모든 테이블 데이터 통합 연동 ===
  const initializeData = useCallback(async () => {
    if (!token || token === "bypass_success_token") return;
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const [contentsRes, userRes, historyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/contents`, { headers }),
        fetch(`${API_BASE_URL}/users/me`, { headers }),
        fetch(`${API_BASE_URL}/watch-history`, { headers })
      ]);
      
      if (contentsRes.ok) {
        const contentsData = await contentsRes.json();
        console.log(`[Initialize] 콘텐츠 목록 로드:`, contentsData.length, "개");
        console.log(`[Initialize] 원본 콘텐츠 제목 목록:`, contentsData.map(m => ({ id: m.id, title: m.title })));
        console.log(`[Initialize] 첫 번째 컨텐츠 샘플:`, contentsData[0]);
        
        // 중복 제목 필터링: "테스트 영화"가 여러 개 있으면 id가 큰 것 제외 (id 3 제외)
        const titleCount = {};
        const filteredContentsData = contentsData.filter(m => {
          if (m.title === '테스트 영화') {
            titleCount[m.title] = (titleCount[m.title] || 0) + 1;
            // "테스트 영화"가 여러 개인 경우, id가 큰 것(id 3) 제외
            if (titleCount[m.title] > 1 && m.id === 3) {
              console.log(`[Initialize] 중복 제목 필터링: id ${m.id} ("${m.title}") 제외`);
              return false;
            }
          }
          return true;
        });
        console.log(`[Initialize] 필터링 후 콘텐츠 개수:`, filteredContentsData.length, "개");
        
        // 좋아요 상태 업데이트 + 썸네일 URL 처리 + 제목 매핑
        const titleMapping = {
          '테스트 영화': '우리들의 일그러진 영웅',
          '테스트': '무한도전',
          '검색 테스트 영화': 'tiny'
        };
        
        // 설명(description) 매핑 (한국어만 설정, 영어는 ContentModal에서 처리)
        const descriptionMapping = {
          '테스트 영화': '40대가 된 한병태는 은사님의 부고 소식을 듣는다. 어린 시절 급장을 맡았던 엄석대가 상갓집에 온다는 소식에 30년 전 작은 교실에서 부조리한 권력을 느꼈던 과거를 회상한다.',
          '테스트': '오분순삭 모음집, 무한도전 다시 보기',
          '검색 테스트 영화': '' // tiny 영상은 설명 없음
        };
        
        const updatedMovies = filteredContentsData.map(m => {
          // 제목 매핑 적용 (표시 제목 변경)
          const displayTitle = titleMapping[m.title] || m.title;
          // 설명 매핑 적용 (매핑이 있으면 사용, 없으면 백엔드 설명 사용)
          const displayDescription = (m.title in descriptionMapping) 
            ? descriptionMapping[m.title] 
            : m.description;
          
          // 썸네일 URL 설정 (제목 매핑이 있는 경우만 강제로 설정)
          let thumbnailUrl = m.thumbnail_url;
          let metaDisplay = m.meta_display;
          
          if (titleMapping[m.title]) {
            // 제목 매핑이 있는 경우에만 썸네일 강제 설정
            // 파일 확장자 확인 (.jpg 또는 .jpeg)
            let thumbnailExt = '.jpg';
            if (displayTitle === '무한도전') {
              thumbnailExt = '.jpeg'; // 무한도전은 .jpeg
            }
            const encodedTitle = encodeURIComponent(displayTitle);
            thumbnailUrl = `/thumbnails/${encodedTitle}${thumbnailExt}`;
            console.log(`[Initialize] 제목 매핑 감지 (${m.title} → ${displayTitle}), 썸네일 설정: ${thumbnailUrl}`);
            
            // "우리들의 일그러진 영웅" 제목일 때 메타 정보 설정 (한국어만 설정, 영어는 ContentModal에서 처리)
            if (displayTitle === '우리들의 일그러진 영웅') {
              metaDisplay = '전체관람가 1992년 ‧ 드라마 ‧ 1시간 58분';
            } else if (displayTitle === '무한도전') {
              // "무한도전" 제목일 때 메타 정보 설정 (한국어만 설정, 영어는 ContentModal에서 처리)
              metaDisplay = '12세이상 1992년 ‧ 예능 ‧ 완결';
            } else if (displayTitle === 'tiny') {
              // "tiny" 제목일 때 메타 정보 설정 (한국어만 설정, 영어는 ContentModal에서 처리)
              metaDisplay = '전체관람가 무료 테스트 ‧ 프로모션 영상';
            }
          }
          // 제목 매핑이 없는 경우에는 백엔드에서 온 thumbnail_url을 그대로 사용
          // (백엔드에서 thumbnail_url이 없으면 기본 이미지 또는 빈 썸네일 사용)
          
          return {
            ...m,
            title: displayTitle, // 매핑된 제목으로 표시
            description: displayDescription, // 매핑된 설명으로 표시
            is_liked: likedContents.has(m.id),
            thumbnail_url: thumbnailUrl,
            meta_display: metaDisplay // 모달에 표시할 메타 정보
          };
        });
        
        console.log(`[Initialize] 업데이트된 영화 목록:`, updatedMovies.length, "개");
        console.log(`[Initialize] 매핑 후 제목 목록:`, updatedMovies.map(m => ({ id: m.id, title: m.title })));
        setMovies(updatedMovies);
        
        // selectedMovie도 업데이트
        if (selectedMovie) {
          const updatedMovie = updatedMovies.find(m => m.id === selectedMovie.id);
          if (updatedMovie) {
            setSelectedMovie(prev => ({
              ...updatedMovie,
              is_liked: likedContents.has(updatedMovie.id)
            }));
          }
        }
      } else {
        if (await checkTokenExpired(contentsRes)) return;
        console.error(`[Initialize] 콘텐츠 목록 로드 실패:`, contentsRes.status, await contentsRes.text());
      }
      
      if (userRes.ok) {
        const data = await userRes.json();
        console.log(`[Initialize] 사용자 정보:`, data);
        setUserData(data);
        setUserRegion(REGION_MAP[data.region_code] || "GLOBAL EDGE");
      } else {
        if (await checkTokenExpired(userRes)) return;
        console.error(`[Initialize] 사용자 정보 로드 실패:`, userRes.status);
      }
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        console.log(`[Initialize] 시청 기록 로드:`, historyData.length, "개");
        setWatchHistory(historyData);
      } else {
        if (await checkTokenExpired(historyRes)) return;
        console.error(`[Initialize] 시청 기록 로드 실패:`, historyRes.status);
      }
    } catch (err) { 
      console.error("[Initialize] 데이터 동기화 실패:", err);
    }
  }, [token, likedContents]);

  // === [기능 추가] 좋아요 API 연동 ===
  const handleToggleLike = async (movie) => {
    if (!movie || !movie.id) {
      console.error("[Like] 유효하지 않은 영화 정보");
      return;
    }
    
    try {
      const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
      
      // 좋아요 목록 조회 (현재 상태 확인)
      const checkRes = await fetch(`${API_BASE_URL}/contents/${movie.id}/likes`, { headers });
      
      let likesList = [];
      let currentLikeCount = movie.like_count || 0;
      
      if (checkRes.ok) {
        try {
          likesList = await checkRes.json();
          // 좋아요 목록의 개수로 현재 상태 추정
          // 참고: user_id 매칭은 불가능하지만, 목록 개수를 활용할 수 있습니다
        } catch (e) {
          console.warn("[Like] 좋아요 목록 파싱 실패:", e);
        }
      }

      // 좋아요 상태 추정: 좋아요 목록의 개수와 현재 콘텐츠의 like_count를 비교
      // 좋아요 목록에 항목이 있고, like_count가 목록 개수 이상이면 이미 좋아요 상태일 가능성이 높음
      // 하지만 다른 사용자의 좋아요도 있을 수 있으므로, 정확하지 않을 수 있습니다
      const isLikelyLiked = likesList.length > 0 && currentLikeCount >= likesList.length;
      
      // 첫 번째 방법 시도: 추정된 상태에 따라 POST/DELETE 선택
      // (정확하지 않으므로 실패 시 반대 시도)
      let method = isLikelyLiked ? "DELETE" : "POST";
      console.log(`[Like] 좋아요 토글: content_id=${movie.id} (${isLikelyLiked ? '취소' : '추가'} 시도)`);
      
      let res = await fetch(`${API_BASE_URL}/contents/${movie.id}/likes`, { 
        method, 
        headers 
      });
      
      if (!res.ok) {
        // 토큰 만료 체크
        if (await checkTokenExpired(res)) return;
        
        // 400 에러 (POST 시도) 또는 404 에러 (DELETE 시도)인 경우 반대 시도
        if ((res.status === 400 && method === "POST") || (res.status === 404 && method === "DELETE")) {
          // 반대 메서드로 재시도
          const oppositeMethod = method === "POST" ? "DELETE" : "POST";
          console.log(`[Like] ${method} 실패 → ${oppositeMethod} 재시도`);
          
          res = await fetch(`${API_BASE_URL}/contents/${movie.id}/likes`, { 
            method: oppositeMethod, 
            headers 
          });
          
          if (!res.ok) {
            // 토큰 만료 체크
            if (await checkTokenExpired(res)) return;
            const errorText = await res.text();
            console.error(`[Like] 좋아요 처리 실패 (${res.status})`);
            if (res.status !== 400 && res.status !== 404) {
              alert(`좋아요 처리 실패: ${errorText}`);
            }
          } else {
            console.log(`[Like] ✅ 좋아요 ${oppositeMethod === "POST" ? "추가" : "취소"} 완료`);
            
            // 로컬 상태 업데이트 (즉시 UI 반영)
            if (oppositeMethod === "POST") {
              // 좋아요 추가
              setLikedContents(prev => new Set(prev).add(movie.id));
              // selectedMovie 업데이트
              if (selectedMovie && selectedMovie.id === movie.id) {
                setSelectedMovie(prev => ({
                  ...prev,
                  is_liked: true,
                  like_count: (prev.like_count || 0) + 1
                }));
              }
              // movies 배열 업데이트
              setMovies(prev => prev.map(m => 
                m.id === movie.id 
                  ? { ...m, is_liked: true, like_count: (m.like_count || 0) + 1 }
                  : m
              ));
            } else {
              // 좋아요 취소
              setLikedContents(prev => {
                const newSet = new Set(prev);
                newSet.delete(movie.id);
                return newSet;
              });
              // selectedMovie 업데이트
              if (selectedMovie && selectedMovie.id === movie.id) {
                setSelectedMovie(prev => ({
                  ...prev,
                  is_liked: false,
                  like_count: Math.max((prev.like_count || 0) - 1, 0)
                }));
              }
              // movies 배열 업데이트
              setMovies(prev => prev.map(m => 
                m.id === movie.id 
                  ? { ...m, is_liked: false, like_count: Math.max((m.like_count || 0) - 1, 0) }
                  : m
              ));
            }
          }
          
          // 데이터 갱신 (백엔드와 동기화)
          initializeData();
          return;
        }
        
        // 다른 에러인 경우
        const errorText = await res.text();
        console.error(`[Like] 좋아요 처리 실패 (${res.status})`);
        if (res.status !== 400 && res.status !== 404) {
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { detail: errorText };
          }
          alert(`좋아요 처리 실패: ${errorData.detail || errorText}`);
        }
        
        // 400/404 에러인 경우 데이터 갱신
        if (res.status === 400 || res.status === 404) {
          initializeData();
        }
        return;
      }
      
      // 성공
      console.log(`[Like] ✅ 좋아요 ${method === "POST" ? "추가" : "취소"} 완료`);
      
      // 로컬 상태 업데이트 (즉시 UI 반영)
      if (method === "POST") {
        // 좋아요 추가
        setLikedContents(prev => new Set(prev).add(movie.id));
        // selectedMovie 업데이트
        if (selectedMovie && selectedMovie.id === movie.id) {
          setSelectedMovie(prev => ({
            ...prev,
            is_liked: true,
            like_count: (prev.like_count || 0) + 1
          }));
        }
        // movies 배열 업데이트
        setMovies(prev => prev.map(m => 
          m.id === movie.id 
            ? { ...m, is_liked: true, like_count: (m.like_count || 0) + 1 }
            : m
        ));
      } else {
        // 좋아요 취소
        setLikedContents(prev => {
          const newSet = new Set(prev);
          newSet.delete(movie.id);
          return newSet;
        });
        // selectedMovie 업데이트
        if (selectedMovie && selectedMovie.id === movie.id) {
          setSelectedMovie(prev => ({
            ...prev,
            is_liked: false,
            like_count: Math.max((prev.like_count || 0) - 1, 0)
          }));
        }
        // movies 배열 업데이트
        setMovies(prev => prev.map(m => 
          m.id === movie.id 
            ? { ...m, is_liked: false, like_count: Math.max((m.like_count || 0) - 1, 0) }
            : m
        ));
      }
      
      // 데이터 갱신 (백엔드와 동기화)
      initializeData();
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
    if (!token || theater || isSearchMode) return; // 로그인하지 않았거나 theater/search 모드면 자동 슬라이드 안 함
    
    const autoSlideInterval = setInterval(() => {
      nextSlide();
    }, 5000); // 5초마다 자동 슬라이드

    return () => clearInterval(autoSlideInterval);
  }, [token, theater, isSearchMode, nextSlide]);

  const handleBypassLogin = () => {
    localStorage.setItem("accessToken", "bypass_success_token");
    setToken("bypass_success_token");
    window.location.reload();
  };

  const handleLogin = async (email, password) => {
    try {
      console.log(`[Login] 로그인 시도: ${email}`);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      console.log(`[Login] 응답 상태: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[Login] 로그인 성공`);
        localStorage.setItem("accessToken", data.access_token);
        setToken(data.access_token);
        window.location.reload();
      } else {
        // 에러 응답 상세 확인
        let errorMessage = "로그인 실패";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.error(`[Login] 로그인 실패 (${response.status}):`, errorData);
        } catch (e) {
          const errorText = await response.text();
          console.error(`[Login] 로그인 실패 (${response.status}):`, errorText);
          errorMessage = response.status === 500 
            ? "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n\n(BYPASS 버튼을 사용하실 수도 있습니다.)" 
            : `로그인 실패: ${response.status} ${response.statusText}`;
        }
        alert(errorMessage);
      }
    } catch (err) { 
      console.error("[Login] 로그인 중 오류:", err);
      alert(`서버 연결 실패: ${err.message}\n\n인터넷 연결을 확인하거나 BYPASS를 사용해주세요.`); 
    }
  };

  // === [수정] 유희님 .mp4 파일 연동 로직 ===
  const handlePlay = async (movie) => {
    console.log(`[Video] ========== handlePlay 호출됨 ==========`);
    console.log(`[Video] movie:`, movie);
    console.log(`[Video] movie?.id:`, movie?.id);
    console.log(`[Video] token:`, token ? token.substring(0, 20) + '...' : '없음');
    
    try {
      if (!movie || !movie.id) {
        console.error("[Video] 유효하지 않은 영화 정보", movie);
        alert("영화 정보가 올바르지 않습니다.");
        return;
      }

      // ContentModal 닫기 (시청하기 버튼 클릭 시)
      console.log(`[Video] ContentModal 닫기`);
      // 검색 모드 종료 (영상 재생 시 검색 화면 숨김)
      setIsSearchMode(false);
      setSearchQuery('');
      setSearchResults([]);
      // theater 모드를 먼저 활성화하여 ContentModal이 렌더링되지 않도록 함
      setTheater(true);

      if (token === "bypass_success_token") {
        console.log("[Video] BYPASS 모드: 테스트 영상 사용");
        setActiveVideoUrl("https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8");
        // theater는 이미 활성화됨
        console.log(`[Video] BYPASS 모드 - theater 활성화 완료`);
        return;
      }

      // 백엔드 API 없이 직접 영상 URL 구성 (Frontend-test 방식 참고)
      console.log(`[Video] 컨텐츠 정보:`, { id: movie.id, title: movie.title });
      console.log(`[Video] movie 객체 전체:`, movie);
      
      // 특정 제목에 대한 하드코딩된 URL 매핑
      const titleVideoMapping = {
        '테스트 영화': 'https://www.formationp.com/우리들의 일그러진 영웅(1992)   Our Twisted Hero(Ulideul-ui ilgeuleojin yeong-ung).mp4',
        '우리들의 일그러진 영웅': 'https://www.formationp.com/우리들의 일그러진 영웅(1992)   Our Twisted Hero(Ulideul-ui ilgeuleojin yeong-ung).mp4',
        '테스트': 'https://www.formationp.com/무한도전.mp4',
        '검색 테스트 영화': 'https://www.formationp.com/327101_tiny.mp4',
        'tiny': 'https://www.formationp.com/327101_tiny.mp4',
        '무한도전': 'https://www.formationp.com/무한도전.mp4'
      };
      
      let videoUrl = null;
      
      if (movie.video_url) {
        // DB에 저장된 영상 URL이 있는 경우 (최우선)
        videoUrl = movie.video_url;
        console.log(`[Video] video_url 사용: ${videoUrl}`);
      } else if (movie.title && titleVideoMapping[movie.title]) {
        // 특정 제목에 대한 하드코딩된 URL 매핑
        videoUrl = titleVideoMapping[movie.title];
        console.log(`[Video] 제목 매핑 사용 (${movie.title}): ${videoUrl}`);
      } else {
        // video_url이 없는 경우 파일명/경로 기반으로 URL 구성
        let videoFileName = null;
        
        if (movie.video_filename) {
          // 컨텐츠 데이터에 영상 파일명이 있는 경우
          videoFileName = movie.video_filename;
          console.log(`[Video] video_filename 사용: ${videoFileName}`);
        } else if (movie.video_path) {
          // 컨텐츠 데이터에 영상 경로가 있는 경우
          videoFileName = movie.video_path;
          console.log(`[Video] video_path 사용: ${videoFileName}`);
        } else if (movie.title) {
          // title을 파일명으로 사용 (API 응답의 실제 파일명 형식)
          videoFileName = `${movie.title}.mp4`;
          console.log(`[Video] title 기반 파일명 생성: ${videoFileName}`);
        } else {
          // ID 기반으로 파일명 생성
          videoFileName = `${movie.id}.mp4`;
          console.log(`[Video] ID 기반 파일명 생성: ${videoFileName}`);
        }

        // CloudFront URL 구성
        if (videoFileName.startsWith('http://') || videoFileName.startsWith('https://')) {
          // 이미 전체 URL인 경우
          videoUrl = videoFileName;
        } else if (videoFileName.startsWith('/')) {
          // 절대 경로인 경우
          videoUrl = `${CLOUDFRONT_DOMAIN}${videoFileName}`;
        } else {
          // 상대 경로인 경우 (루트 경로 사용, API 응답 형식과 동일)
          videoUrl = `${CLOUDFRONT_DOMAIN}/${videoFileName}`;
        }
      }
      
      if (!videoUrl) {
        console.warn(`[Video] 영상 URL을 구성할 수 없습니다:`, movie);
        setTheater(false);
        alert(`이 컨텐츠는 아직 재생할 수 없습니다.\n\n(영상 정보 없음)`);
        return;
      }
      
      // 상태 업데이트: selectedMovie -> activeVideoUrl (theater는 이미 활성화됨)
      // URL 인코딩 없이 그대로 사용 (브라우저/CloudFront가 자동 처리)
      console.log(`[Video] 상태 업데이트 시작...`);
      
      // selectedMovie 설정 (플레이어에 전달하기 위해)
      setSelectedMovie(movie);
      console.log(`[Video] selectedMovie 설정 완료`);
      
      setActiveVideoUrl(videoUrl);
      console.log(`[Video] activeVideoUrl 설정 완료: ${videoUrl}`);
      console.log(`[Video] theater 모드 활성화 완료`);
      
    } catch (err) {
      console.error("[Video] 영상 로드 실패:", err);
      console.error("[Video] 에러 스택:", err.stack);
      setTheater(false); // theater 모드 리셋
      setActiveVideoUrl(""); // 비디오 URL 초기화
      alert(`영상 로드 실패: ${err.message || "알 수 없는 오류"}\n\n콘솔을 확인해주세요.`);
    }
  };

  // 검색 기능 - 백엔드 검색 API 활용 (/search?q=)
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearchMode(false);
      return;
    }

    setIsSearching(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      
      // 제목 매핑 정의 (검색 결과 처리용)
      const titleMapping = {
        '테스트 영화': '우리들의 일그러진 영웅',
        '테스트': '무한도전',
        '검색 테스트 영화': 'tiny'
      };
      
      // 역방향 매핑: 매핑된 제목 → 원본 제목
      const reverseMapping = {};
      Object.keys(titleMapping).forEach(key => {
        reverseMapping[titleMapping[key]] = key;
      });
      
      // 검색어가 매핑된 제목의 일부 문자와 일치하는지 확인
      const findMappedTitleByPartialMatch = (searchQuery) => {
        const mappedTitles = Object.values(titleMapping); // ['우리들의 일그러진 영웅', '무한도전', 'tiny']
        for (const mappedTitle of mappedTitles) {
          if (mappedTitle.includes(searchQuery)) {
            return { mappedTitle, originalTitle: reverseMapping[mappedTitle] };
          }
        }
        return null;
      };
      
      // 검색어가 매핑된 제목인 경우 원본 제목으로 검색
      let apiSearchQuery = query; // API에 전송할 검색어
      const isMappedTitle = reverseMapping[query]; // 정확히 매핑된 제목인지 확인
      let originalTitleForFallback = null; // fallback용 원본 제목
      let isPartialMatch = false; // 부분 일치 여부
      
      // 부분 일치 확인
      const partialMatch = findMappedTitleByPartialMatch(query);
      if (partialMatch) {
        originalTitleForFallback = partialMatch.originalTitle;
        isPartialMatch = true;
        console.log(`[Search] 부분 일치 감지 (${query} → ${partialMatch.mappedTitle}, 원본: ${originalTitleForFallback})`);
      } else if (isMappedTitle) {
        // 정확히 매핑된 제목으로 검색한 경우, 원본 제목으로만 검색
        apiSearchQuery = isMappedTitle;
        originalTitleForFallback = isMappedTitle;
        console.log(`[Search] 매핑된 제목 검색 감지 (${query} → 원본 제목으로 검색: ${apiSearchQuery})`);
      }
      
      // 백엔드 검색 API 엔드포인트 사용: /search?q={query}
      const searchUrl = `${API_BASE_URL}/search?q=${encodeURIComponent(apiSearchQuery)}`;
      console.log(`[Search] 검색 API 호출: ${searchUrl}`);
      
      const response = await fetch(searchUrl, { headers });
      console.log(`[Search] 검색 API 응답 상태: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[Search] 검색 API 응답 데이터:`, data);
        
        // SearchResponse 형식: { hits: [...], query: "...", ... }
        let searchData = data.hits || [];
        console.log(`[Search] 검색 결과 개수: ${searchData.length}개`);
        
        // 매핑된 제목으로 검색한 경우, 원본 제목과 일치하는 항목만 필터링
        if ((isMappedTitle || isPartialMatch) && searchData.length > 0 && originalTitleForFallback) {
          searchData = searchData.filter(item => item.title === originalTitleForFallback);
          console.log(`[Search] 원본 제목 필터링 후 결과: ${searchData.length}개`);
        }
        
        // 검색 결과가 없고 매핑된 제목(정확히 일치 또는 부분 일치)으로 검색한 경우, movies 배열에서 직접 찾기
        if (searchData.length === 0 && (isMappedTitle || isPartialMatch) && originalTitleForFallback) {
          const foundMovie = movies.find(m => m.title === originalTitleForFallback || m.title === query);
          
          if (!foundMovie) {
            // 원본 제목으로 찾기
            const movieWithOriginalTitle = movies.find(m => {
              // movies 배열의 title이 이미 매핑된 제목일 수 있으므로, 원본 제목을 가진 항목 찾기
              const movieOriginalTitle = Object.keys(titleMapping).find(key => titleMapping[key] === m.title);
              return movieOriginalTitle === originalTitleForFallback;
            });
            
            if (movieWithOriginalTitle) {
              // 원본 데이터 형식으로 변환 (검색 API 응답 형식과 동일하게)
              const originalMovie = {
                id: movieWithOriginalTitle.id,
                title: originalTitleForFallback, // 원본 제목
                description: movieWithOriginalTitle.description,
                thumbnail_url: movieWithOriginalTitle.thumbnail_url,
                age_rating: movieWithOriginalTitle.age_rating,
                meta: movieWithOriginalTitle.meta,
                like_count: movieWithOriginalTitle.like_count || 0
              };
              searchData = [originalMovie];
              console.log(`[Search] movies 배열에서 직접 찾음 (원본 제목: ${originalTitleForFallback})`);
            }
          } else {
            // foundMovie가 있으면 원본 제목으로 변환
            const originalMovie = {
              id: foundMovie.id,
              title: originalTitleForFallback,
              description: foundMovie.description,
              thumbnail_url: foundMovie.thumbnail_url,
              age_rating: foundMovie.age_rating,
              meta: foundMovie.meta,
              like_count: foundMovie.like_count || 0
            };
            searchData = [originalMovie];
            console.log(`[Search] movies 배열에서 직접 찾음 (원본 제목: ${originalTitleForFallback})`);
          }
        }
        
        // "테스트" 검색어 포함 시 "우리들의 일그러진 영웅" 추가
        if (query.toLowerCase().includes('테스트')) {
          const heroMovie = movies.find(m => m.title && m.title.includes('우리들의 일그러진 영웅'));
          if (heroMovie) {
            // 이미 검색 결과에 없으면 추가
            const existsInResults = searchData.some(item => item.id === heroMovie.id);
            if (!existsInResults) {
              searchData = [heroMovie, ...searchData];
              console.log(`[Search] "우리들의 일그러진 영웅" 추가됨`);
            }
          }
        }
        
        // 검색 결과에 제목 매핑 및 is_liked 속성 추가
        const descriptionMapping = {
          '테스트 영화': '40대가 된 한병태는 은사님의 부고 소식을 듣는다. 어린 시절 급장을 맡았던 엄석대가 상갓집에 온다는 소식에 30년 전 작은 교실에서 부조리한 권력을 느꼈던 과거를 회상한다.',
          '테스트': '오분순삭 모음집, 무한도전 다시 보기',
          '검색 테스트 영화': ''
        };
        
        const resultsWithMapping = searchData.map(item => {
          const displayTitle = titleMapping[item.title] || item.title;
          const displayDescription = (item.title in descriptionMapping) 
            ? descriptionMapping[item.title] 
            : item.description;
          
          // 썸네일 URL 설정 (제목 매핑이 있는 경우만 강제 설정)
          let thumbnailUrl = item.thumbnail_url;
          let metaDisplay = item.meta_display;
          
          if (titleMapping[item.title]) {
            // 제목 매핑이 있는 경우에만 썸네일 강제 설정
            // 파일 확장자 확인 (.jpg 또는 .jpeg)
            let thumbnailExt = '.jpg';
            if (displayTitle === '무한도전') {
              thumbnailExt = '.jpeg'; // 무한도전은 .jpeg
            }
            const encodedTitle = encodeURIComponent(displayTitle);
            thumbnailUrl = `/thumbnails/${encodedTitle}${thumbnailExt}`;
            console.log(`[Search] 제목 매핑 감지 (${item.title} → ${displayTitle}), 썸네일 설정: ${thumbnailUrl}`);
            
            // 메타 정보 설정
            if (displayTitle === '우리들의 일그러진 영웅') {
              metaDisplay = '전체관람가 1992년 ‧ 드라마 ‧ 1시간 58분';
            } else if (displayTitle === '무한도전') {
              metaDisplay = '12세이상 1992년 ‧ 예능 ‧ 완결';
            } else if (displayTitle === 'tiny') {
              metaDisplay = '전체관람가 무료 테스트 ‧ 프로모션 영상';
            }
          }
          
          return {
            ...item,
            title: displayTitle, // 매핑된 제목으로 표시
            description: displayDescription, // 매핑된 설명으로 표시
            thumbnail_url: thumbnailUrl, // 매핑된 썸네일 URL
            meta_display: metaDisplay, // 메타 정보
            is_liked: likedContents.has(item.id) || false
          };
        });
        
        setSearchResults(resultsWithMapping);
        setIsSearchMode(true);
      } else {
        if (await checkTokenExpired(response)) return;
        
        // 503 등의 에러 처리 (Meilisearch 서비스 사용 불가)
        if (response.status === 503) {
          console.warn(`[Search] 검색 서비스 사용 불가 (503)`);
          // 검색 서비스가 없을 때는 빈 결과 반환
          setSearchResults([]);
        } else if (response.status === 404) {
          console.log(`[Search] 검색 결과 없음: ${response.status}`);
          setSearchResults([]);
        } else {
          const errorText = await response.text();
          console.error(`[Search] 검색 실패 (${response.status}):`, errorText);
          setSearchResults([]);
        }
      }
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
  }, [token, initializeData]);

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
                    type="text"
                    className="search-input"
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        handleSearch(e.target.value);
                      } else {
                        setSearchResults([]);
                        setIsSearchMode(false);
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
                <div className="search-icon-btn" onClick={() => setIsSearchMode(true)}>
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
                  <div className="profile-icon-box">{userData?.first_name?.charAt(0).toUpperCase() || "S"}</div>
                  <div className="dropdown-arrow"></div>
                </div>
                {isProfileOpen && (
                  <div className="profile-dropdown">
                    <div className="dropdown-item" style={{pointerEvents: 'none', paddingBottom: '0'}}>
                      <strong>
                        {userData?.first_name && userData?.last_name 
                          ? `${userData.first_name} ${userData.last_name}님`
                          : userData?.first_name 
                          ? `${userData.first_name}님`
                          : userData?.last_name
                          ? `${userData.last_name}님`
                          : '사용자님'}
                      </strong>
                      <div style={{fontSize: '0.7rem', color: '#888', marginTop: '4px'}}>{userData?.email || ''}</div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-info-row">
                      <div><span className="info-label">접속 리전:</span> <span className="info-value">{userRegion}</span></div>
                      <div>
                        <span className="info-label">가입 일시:</span>
                        <span className="info-value">{userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : "2026. 01. 16."}</span>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item" onClick={() => {localStorage.removeItem("accessToken"); window.location.reload();}}>Formation+에서 로그아웃</div>
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
                        {searchResults.map(item => (
                          <div 
                            key={item.id} 
                            className="search-thumbnail" 
                            style={{ backgroundImage: `url(${item.thumbnail_url})` }} 
                            onClick={() => setSelectedMovie(item)}
                          >
                            <div className="thumbnail-overlay">
                              <div className="thumbnail-title">{item.title}</div>
                              <div className="thumbnail-like">❤️ {item.like_count || 0}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : searchQuery && !isSearching ? (
                  <div className="search-no-results">
                    <h2 className="search-section-title">"{searchQuery}" {t('search_results')}</h2>
                    <p>{t('no_search_results')}</p>
                  </div>
                ) : !searchQuery ? (
                  <>
                    <h2 className="search-section-title">{t('recommendations')}</h2>
                    <div className="search-row">
                      <div className="search-row-content">
                        {movies.slice(0, 10).map(item => (
                          <div 
                            key={item.id} 
                            className="search-thumbnail" 
                            style={{ backgroundImage: `url(${item.thumbnail_url})` }} 
                            onClick={() => setSelectedMovie(item)}
                          >
                            <div className="thumbnail-overlay">
                              <div className="thumbnail-title">{item.title}</div>
                              <div className="thumbnail-like">❤️ {item.like_count || 0}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
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
                    {displayMovies.map((s, idx) => (
                      <div key={s.id} className={`hero-slide ${idx === currentIdx ? 'active' : ''}`} style={{ backgroundImage: `url(${s.thumbnail_url})` }}>
                        <div className="hero-overlay">
                          <div className="hero-content">
                            <h1 className="hero-title">{s.title}</h1>
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
                    ))}
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
                              <div className="thumbnail-title">{movie.title}</div>
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
                    <h3 className="row-title">{t('recommend_title')}</h3>
                    <div className="content-row-wrapper">
                      <div className="content-row-content">
                        {movies.map(item => (
                          <div 
                            key={item.id} 
                            className="content-thumbnail" 
                            style={{ backgroundImage: `url(${item.thumbnail_url})` }} 
                            onClick={() => setSelectedMovie(item)}
                          >
                            <div className="thumbnail-overlay">
                              <div className="thumbnail-title">{item.title}</div>
                              <div className="thumbnail-like">❤️ {item.like_count || 0}</div>
                            </div>
                          </div>
                        ))}
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
