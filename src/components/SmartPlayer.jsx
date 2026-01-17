import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const SmartPlayer = ({ src, region, contentData, initialTime, onProgressSave }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const lastSavedTimeRef = useRef(0);
  const resumeTimeCheckedRef = useRef(false);
  const pendingResumeTimeRef = useRef(null);
  const [status, setStatus] = useState('시스템 확인 중...');
  const [hasError, setHasError] = useState(false);

  // === [.mp4 지원] 타입 자동 감지 ===
  const getVideoType = (url) => {
    if (!url) return 'video/mp4';
    if (url.includes('.m3u8')) return 'application/x-mpegURL';
    return 'video/mp4';
  };

  // contentData와 initialTime을 ref로 저장 (최신 값 참조)
  const contentDataRef = useRef(contentData);
  const initialTimeRef = useRef(initialTime);
  
  useEffect(() => {
    contentDataRef.current = contentData;
    initialTimeRef.current = initialTime;
  }, [contentData, initialTime]);

  // 플레이어 초기화 (한 번만) - 플래그로 중복 방지
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    // 이미 초기화되었으면 스킵
    if (isInitializedRef.current || playerRef.current) {
      console.log("[SmartPlayer] 플레이어가 이미 초기화되어 있습니다. 스킵합니다.");
      return;
    }

    if (!videoRef.current) {
      console.warn("[SmartPlayer] videoRef가 아직 준비되지 않았습니다.");
      return;
    }

    // DOM에 포함되었는지 확인
    if (!videoRef.current.isConnected) {
      console.warn("[SmartPlayer] video 요소가 DOM에 포함되지 않았습니다. 지연 후 재시도...");
      const timer = setTimeout(() => {
        if (isMountedRef.current && videoRef.current && videoRef.current.isConnected && !isInitializedRef.current && !playerRef.current) {
          console.log(`[SmartPlayer] DOM 포함 확인 후 플레이어 초기화 시작`);
          initializePlayer();
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    initializePlayer();
    
    function initializePlayer() {
      // 다시 한 번 체크 (비동기 타이밍 이슈 방지)
      if (!isMountedRef.current) {
        console.log("[SmartPlayer] 컴포넌트가 언마운트되었습니다. 초기화 중단.");
        return;
      }
      
      if (isInitializedRef.current || playerRef.current) {
        console.log("[SmartPlayer] 플레이어가 이미 초기화되어 있습니다.");
        return;
      }

      if (!videoRef.current || !videoRef.current.isConnected) {
        console.warn("[SmartPlayer] videoRef가 DOM에 없습니다.");
        return;
      }

      console.log(`[SmartPlayer] 플레이어 초기화 시작`);
      isInitializedRef.current = true; // 플래그 설정

    // 플레이어 초기화
    const player = videojs(videoRef.current, {
      autoplay: true,
      controls: true,
      responsive: false, // responsive 비활성화 (직접 크기 제어)
      fluid: false, // fluid 비활성화 (직접 크기 제어)
      width: '100%',
      height: '100%',
      userActions: { hotkeys: true },
      playbackRates: [0.5, 1, 1.5, 2],
      inactivityTimeout: 1500 // 1.5초 후 자동 숨김
    });
    
    // 플레이어 준비 시 스타일 적용
    player.ready(() => {
      // 비디오 요소 스타일 적용
      const videoEl = player.el().querySelector('video');
      if (videoEl) {
        videoEl.style.setProperty('width', '100%', 'important');
        videoEl.style.setProperty('height', '100%', 'important');
        videoEl.style.setProperty('display', 'block', 'important');
        videoEl.style.setProperty('visibility', 'visible', 'important');
        videoEl.style.setProperty('opacity', '1', 'important');
        videoEl.style.setProperty('position', 'absolute', 'important');
        videoEl.style.setProperty('top', '0', 'important');
        videoEl.style.setProperty('left', '0', 'important');
      }
      
      // 컨트롤 바 스타일 적용 (위치만 설정, opacity/visibility는 video.js가 관리)
      setTimeout(() => {
        applyControlBarStyles();
      }, 100);
    });

      playerRef.current = player;

    // src가 변경되면 확인 플래그 리셋
    resumeTimeCheckedRef.current = false;
    pendingResumeTimeRef.current = null;

    // 이어보기 확인 및 재생 로직을 별도 함수로 분리
    const handleCanPlay = () => {
      console.log("[SmartPlayer] canplay 이벤트 발생 - 재생 준비 완료");
      
      // 한 번만 확인 (src 변경 시 재확인)
      if (!resumeTimeCheckedRef.current) {
        resumeTimeCheckedRef.current = true;
        
        // 이어보기 시간 확인 (최신 ref 값 사용)
        let resumeTime = 0;
        const currentContentData = contentDataRef.current;
        const currentInitialTime = initialTimeRef.current;
        
        if (currentContentData && currentContentData.id) {
          const localTime = localStorage.getItem(`save_time_${currentContentData.id}`);
          resumeTime = currentInitialTime > 0 ? currentInitialTime : (localTime ? parseFloat(localTime) : 0);
        }

        if (resumeTime > 5) {
          console.log(`[SmartPlayer] 이어보기 시간: ${resumeTime}초`);
          const confirmResume = window.confirm(
            `${Math.floor(resumeTime / 60)}분 ${Math.floor(resumeTime % 60)}초 지점부터 이어보시겠습니까?`
          );
          
          if (confirmResume) {
            console.log(`[SmartPlayer] 이어보기 설정: ${resumeTime}초`);
            if (playerRef.current) {
              playerRef.current.currentTime(resumeTime);
              console.log(`[SmartPlayer] 재생 위치 설정: ${resumeTime}초`);
              
              // 약간의 지연 후 재생 (currentTime 설정 완료 대기)
              setTimeout(() => {
                if (playerRef.current && playerRef.current.readyState() >= 2) {
                  const playPromise = playerRef.current.play();
                  if (playPromise !== undefined) {
                    playPromise.then(() => {
                      console.log("[SmartPlayer] 이어보기 재생 시작됨");
                    }).catch(error => {
                      // AbortError는 무시 (페이지 frozen 등의 경우)
                      if (error.name !== 'AbortError') {
                        console.error("[SmartPlayer] 이어보기 재생 실패:", error);
                        setStatus('재생 버튼을 클릭해주세요');
                      }
                    });
                  }
                } else {
                  // readyState가 충분하지 않으면 canplay 이벤트 대기
                  const waitForReady = () => {
                    if (playerRef.current && playerRef.current.readyState() >= 2) {
                      const playPromise = playerRef.current.play();
                      if (playPromise !== undefined) {
                        playPromise.catch(error => {
                          if (error.name !== 'AbortError') {
                            console.error("[SmartPlayer] 이어보기 재생 실패:", error);
                          }
                        });
                      }
                      playerRef.current.off('canplay', waitForReady);
                    }
                  };
                  playerRef.current.on('canplay', waitForReady);
                }
              }, 200);
            }
            return;
          } else {
            console.log("[SmartPlayer] 처음부터 재생");
          }
        }
        
        // 처음부터 재생 (이어보기 없거나 취소한 경우)
        console.log("[SmartPlayer] 처음부터 재생 시작");
        if (playerRef.current) {
          playerRef.current.currentTime(0);
          
          // readyState 확인 후 재생
          if (playerRef.current.readyState() >= 2) {
            const playPromise = playerRef.current.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log("[SmartPlayer] 처음부터 재생 성공");
              }).catch(error => {
                // AbortError는 무시 (페이지 frozen 등의 경우)
                if (error.name !== 'AbortError') {
                  console.error("[SmartPlayer] 처음부터 재생 실패:", error);
                  setStatus('재생 버튼을 클릭해주세요');
                }
              });
            }
          } else {
            // readyState가 충분하지 않으면 canplay 이벤트 대기
            const waitForReady = () => {
              if (playerRef.current && playerRef.current.readyState() >= 2) {
                const playPromise = playerRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(error => {
                    if (error.name !== 'AbortError') {
                      console.error("[SmartPlayer] 처음부터 재생 실패:", error);
                    }
                  });
                }
                playerRef.current.off('canplay', waitForReady);
              }
            };
            playerRef.current.on('canplay', waitForReady);
          }
        }
      }
    };

    player.on('canplay', handleCanPlay);
    
    // canplaythrough 이벤트에서도 재생 시도 (추가 보장)
    player.on('canplaythrough', () => {
      console.log("[SmartPlayer] canplaythrough 이벤트 발생");
      // canplay에서 이미 처리했으므로 추가 처리 불필요
    });

    player.on('playing', () => {
      console.log("[SmartPlayer] 재생 시작");
      setStatus('재생 중');
      setHasError(false);
    });

    player.on('timeupdate', () => {
      const currentContentData = contentDataRef.current;
      if (!currentContentData || !currentContentData.id) return;
      
      const currentTime = player.currentTime();
      if (currentTime <= 0) return;
      localStorage.setItem(`save_time_${currentContentData.id}`, currentTime);
      if (Math.floor(currentTime) >= lastSavedTimeRef.current + 10) {
        lastSavedTimeRef.current = Math.floor(currentTime);
        if (onProgressSave) onProgressSave(currentContentData.id, currentTime);
      }
    });

    player.on('error', (error) => {
      console.error("[SmartPlayer] 플레이어 에러:", error);
      console.error("[SmartPlayer] 에러 상세:", {
        code: error?.code,
        message: error?.message,
        type: error?.type,
        player: playerRef.current?.error()
      });
      
      const playerError = playerRef.current?.error();
      if (playerError) {
        console.error("[SmartPlayer] 비디오 에러 코드:", playerError.code);
        console.error("[SmartPlayer] 비디오 에러 메시지:", playerError.message);
        
        let errorMessage = '비디오를 재생할 수 없습니다.';
        if (playerError.code === 4) {
          errorMessage = '비디오 파일을 찾을 수 없습니다. (404)';
        } else if (playerError.code === 3) {
          errorMessage = '비디오 디코딩 오류가 발생했습니다.';
        } else if (playerError.code === 2) {
          errorMessage = '네트워크 오류가 발생했습니다.';
        } else if (playerError.code === 1) {
          errorMessage = '비디오 로드를 중단했습니다.';
        }
        setStatus(errorMessage);
      } else {
        setStatus('인증되지 않은 접근이거나 리전 정책 위반입니다.');
      }
      setHasError(true);
    });

    player.on('loadstart', () => {
      console.log("[SmartPlayer] 비디오 로드 시작");
      setStatus('비디오 로딩 중...');
    });

    // 전체화면 상태 추적
    let isFullscreenRef = { current: false };
    let controlCheckIntervalRef = { current: null };

    // 비디오 요소 스타일 적용 함수
    const applyVideoStyles = () => {
      const videoEl = player.el()?.querySelector('video');
      if (videoEl) {
        videoEl.style.setProperty('width', '100%', 'important');
        videoEl.style.setProperty('height', '100%', 'important');
        videoEl.style.setProperty('display', 'block', 'important');
        videoEl.style.setProperty('visibility', 'visible', 'important');
        videoEl.style.setProperty('opacity', '1', 'important');
        videoEl.style.setProperty('position', 'absolute', 'important');
        videoEl.style.setProperty('top', '0', 'important');
        videoEl.style.setProperty('left', '0', 'important');
      }
    };

    // 컨트롤 바 스타일 적용 함수 (전체화면/일반 모드 공통)
    const applyControlBarStyles = () => {
      const controlBar = player.controlBar?.el();
      if (controlBar) {
        controlBar.style.setProperty('position', 'absolute', 'important');
        controlBar.style.setProperty('bottom', '30px', 'important');
        controlBar.style.setProperty('left', '50%', 'important');
        controlBar.style.setProperty('transform', 'translateX(-50%)', 'important');
        controlBar.style.setProperty('right', 'auto', 'important');
        controlBar.style.setProperty('top', 'auto', 'important');
        controlBar.style.setProperty('width', '600px', 'important');
        controlBar.style.setProperty('max-width', '90%', 'important');
        controlBar.style.setProperty('justify-content', 'center', 'important');
        controlBar.style.setProperty('box-sizing', 'border-box', 'important');
      }
    };

    player.on('loadeddata', () => {
      console.log("[SmartPlayer] 비디오 데이터 로드 완료");
      setStatus('재생 준비 완료');
      
      // 비디오 요소가 제대로 표시되도록 확인
      setTimeout(() => {
        applyVideoStyles();
        applyControlBarStyles();
        console.log("[SmartPlayer] loadeddata - 비디오 요소 및 컨트롤 바 스타일 적용");
      }, 100);
    });
    
    // 전체화면 변경 감지
    player.on('fullscreenchange', () => {
      const isFullscreen = player.isFullscreen();
      isFullscreenRef.current = isFullscreen;
      
      console.log(`[SmartPlayer] 전체화면 모드: ${isFullscreen}`);
      
      // 일반 모드/전체화면 모드 모두 1.5초 후 자동 숨김
      player.inactivityTimeout(1500);
      
      // 컨트롤 바 스타일 적용 (위치만, opacity/visibility는 video.js가 관리)
      setTimeout(() => {
        applyControlBarStyles();
      }, 100);
      
      // 주기적 강제 표시 중지 (자동 숨김이 작동하도록)
      if (controlCheckIntervalRef.current) {
        clearInterval(controlCheckIntervalRef.current);
        controlCheckIntervalRef.current = null;
      }
    });

    // 플레이어 준비 완료 (위의 player.ready와 중복이므로 제거됨)
    } // initializePlayer 함수 닫기

    return () => {
      // cleanup 시에만 실행 (언마운트 시)
      isMountedRef.current = false;
      
      // React Strict Mode에서는 cleanup이 즉시 실행되지만, 실제 언마운트가 아니면 스킵
      // 약간의 지연을 두고 실제로 언마운트되었는지 확인
      const timer = setTimeout(() => {
        if (!isMountedRef.current && playerRef.current) {
          console.log("[SmartPlayer] 플레이어 정리 중...");
          try {
            playerRef.current.dispose();
          } catch (e) {
            console.error("[SmartPlayer] 플레이어 정리 중 에러:", e);
          }
          playerRef.current = null;
          isInitializedRef.current = false;
        }
      }, 2000); // 2초 지연 (초기화와 cleanup이 동시에 실행되는 경우 방지)
      
      return () => clearTimeout(timer);
    };
  }, []); // 한 번만 초기화 (최신 props는 ref로 참조)

  // src가 변경될 때 플레이어에 새로운 소스 설정
  useEffect(() => {
    if (!playerRef.current || !src) {
      if (!src) {
        console.warn("[SmartPlayer] 비디오 소스가 없습니다.");
        setStatus('비디오 소스를 불러오는 중...');
      }
      return;
    }

    console.log(`[SmartPlayer] 비디오 소스 변경: ${src}`);
    setStatus('비디오 소스 설정 중...');
    setHasError(false);

    try {
      // 이어보기 확인 플래그 리셋 (새로운 src 로드 시)
      resumeTimeCheckedRef.current = false;
      pendingResumeTimeRef.current = null;
      
      console.log(`[SmartPlayer] 소스 설정 시작: ${src}`);
      playerRef.current.src({
        src: src,
        type: getVideoType(src)
      });
      
      // load() 호출하여 메타데이터 로드 시작
      playerRef.current.load();
      console.log(`[SmartPlayer] load() 호출 완료`);
      
      // canplay 이벤트가 발생하지 않을 경우를 대비한 fallback
      // loadedmetadata 이벤트에서도 재생 시도
      const handleLoadedMetadata = () => {
        console.log(`[SmartPlayer] loadedmetadata 이벤트 발생`);
        // canplay 이벤트에서 재생하므로 여기서는 하지 않음
        playerRef.current.off('loadedmetadata', handleLoadedMetadata);
      };
      playerRef.current.on('loadedmetadata', handleLoadedMetadata);
      
    } catch (error) {
      console.error("[SmartPlayer] 소스 설정 실패:", error);
      setHasError(true);
      setStatus('비디오 소스 설정 실패');
    }
  }, [src]);

  if (!contentData) {
    return <div className="smart-player-box">콘텐츠 정보를 불러오는 중...</div>;
  }

  return (
    <div className="smart-player-box">
      <div className="video-relative-wrapper" style={{ position: 'relative' }}>
        {hasError && (
          <div className="player-error-overlay" style={{ 
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', 
            zIndex: 10, display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center' 
          }}>
            <h3 style={{ color: '#fff' }}>⚠️ 콘텐츠를 불러올 수 없습니다</h3>
            <p style={{ color: '#ccc', fontSize: '0.8rem' }}>URL: {src}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '10px', padding: '8px 16px' }}>다시 시도</button>
          </div>
        )}

        <div data-vjs-player>
          <video ref={videoRef} className="video-js vjs-big-play-centered" playsInline />
        </div>
      </div>
    </div>
  );
};

export default SmartPlayer;
