import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import SecurityBanner from './SecurityBanner';

// [Task 3] initialTime 프롭스 추가 (서버 DB에서 가져온 last_played_time)
const SmartPlayer = ({ src, region, contentData, initialTime, onProgressSave }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const lastSavedTimeRef = useRef(0); 
  const [status, setStatus] = useState('시스템 확인 중...');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (videoRef.current && !playerRef.current) {
      const player = videojs(videoRef.current, {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        userActions: { hotkeys: true },
        playbackRates: [0.5, 1, 1.5, 2],
        sources: [{ src, type: 'application/x-mpegURL' }]
      });

      playerRef.current = player;

      player.on('playing', () => {
        setStatus('안전 경로 재생 중');
        setHasError(false);

        // [Task 3: 이어보기 로직 고도화]
        // 1. 서버 DB의 last_played_time을 최우선으로 확인
        // 2. 서버 데이터가 없으면 로컬 스토리지 확인
        const localTime = localStorage.getItem(`save_time_${contentData.id}`);
        const resumeTime = initialTime > 0 ? initialTime : (localTime ? parseFloat(localTime) : 0);

        if (resumeTime > 5) { // 5초 이상 기록이 있을 때만 팝업
          const confirmResume = window.confirm(
            `${Math.floor(resumeTime / 60)}분 ${Math.floor(resumeTime % 60)}초 지점부터 이어보시겠습니까?`
          );
          if (confirmResume) {
            player.currentTime(resumeTime);
          }
        }
      });

      player.on('timeupdate', () => {
        const currentTime = player.currentTime();
        if (currentTime <= 0) return;

        // 즉시성을 위해 로컬 저장
        localStorage.setItem(`save_time_${contentData.id}`, currentTime);

        // [Task 3] 10초마다 서버 DB의 last_played_time 업데이트
        if (Math.floor(currentTime) >= lastSavedTimeRef.current + 10) {
          lastSavedTimeRef.current = Math.floor(currentTime);
          if (onProgressSave) {
            onProgressSave(contentData.id, currentTime); 
          }
        }
      });

      player.on('waiting', () => setStatus('리전 최적화 경로 찾는 중 (버퍼링)...'));

      player.on('error', () => {
        setStatus('인증되지 않은 접근이거나 리전 정책 위반입니다.');
        setHasError(true);
      });
    }

    if (playerRef.current && src) {
      playerRef.current.src({ src, type: 'application/x-mpegURL' });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, contentData.id, initialTime, onProgressSave]);

  const skip = (seconds) => {
    if (playerRef.current) {
      playerRef.current.currentTime(playerRef.current.currentTime() + seconds);
    }
  };

  return (
    <div className="smart-player-box">
      {/* 대시보드 및 에러 핸들링 UI (수민님 기존 코드 유지) */}
      <div className="player-dashboard">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`age-tag age-${contentData.age_rating}`}>{contentData.age_rating}</span>
          <strong>{contentData.title}</strong>
        </div>
        <div>📡 {region} 엣지 가속 | {status}</div>
      </div>

      <div className="video-relative-wrapper" style={{ position: 'relative' }}>
        {hasError && (
          <div className="player-error-overlay" style={{ /* 스타일 생략 */ }}>
            <h3>⚠️ 콘텐츠를 불러올 수 없습니다</h3>
            <button onClick={() => window.location.reload()}>다시 시도</button>
          </div>
        )}

        {/* 10초 이동 컨트롤 */}
        {!hasError && (
          <div className="skip-controls" style={{ /* 스타일 생략 */ }}>
            <button onClick={() => skip(-10)}>⏪</button>
            <button onClick={() => skip(10)}>⏩</button>
          </div>
        )}

        <div data-vjs-player>
          <video ref={videoRef} className="video-js vjs-big-play-centered" />
        </div>
        <SecurityBanner contentData={contentData} region={region} />
      </div>
    </div>
  );
};

export default SmartPlayer;
