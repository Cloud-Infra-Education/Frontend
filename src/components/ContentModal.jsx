import React from "react";
import { useTranslation } from 'react-i18next';
import "./ContentModal.css";

export default function ContentModal({ content, onClose, onPlay, onLike }) {
  const { t, i18n } = useTranslation();
  if (!content) return null;
  
  // 언어에 따라 메타 정보와 설명을 다르게 표시
  const getMetaDisplay = () => {
    if (!content.meta_display) return null;
    
    // 영어일 때 특정 제목에 대해 다른 메타 정보 표시
    if (i18n.language === 'en') {
      if (content.title === '우리들의 일그러진 영웅' || content.title === 'Our Twisted Hero') {
        return 'The total audience 1992 ‧ drama ‧ 1 hour 58 minutes';
      } else if (content.title === '무한도전' || content.title === 'Infinite Challenge') {
        return '12 years of age or older 1992 ‧ Entertainment ‧ Completion';
      } else if (content.title === 'tiny') {
        return 'The total audience Free test ‧ promotional video';
      }
    }
    
    // 한국어일 때는 원본 meta_display 사용
    return content.meta_display;
  };
  
  const getDescription = () => {
    // 영어일 때 특정 제목에 대해 다른 설명 표시
    if (i18n.language === 'en') {
      if (content.title === '우리들의 일그러진 영웅' || content.title === 'Our Twisted Hero') {
        return 'In his 40s, Han Byeong-tae hears the obituary of his teacher. He recalls the past when he felt absurd power in a small classroom 30 years ago when he heard that Um Seok-dae, who was the chief of staff when he was a child, was coming to a commercial house.';
      }
    }
    
    // 한국어일 때는 원본 description 사용
    return content.description;
  };
  
  const metaDisplay = getMetaDisplay();
  const description = getDescription();

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* e.stopPropagation()을 넣어야 모달 내부를 클릭해도 창이 안 닫힙니다. */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        
        <div className="modal-inner-body">
          <h2 className="modal-title">{content.title}</h2>
          
          <div className="modal-meta-info">
            {metaDisplay ? (
              // meta_display 형식: "전체관람가 1992년 ‧ 드라마 ‧ 1시간 58분" 또는 "The total audience 1992 ‧ drama ‧ 1 hour 58 minutes"
              (() => {
                const parts = metaDisplay.split(' ');
                // 영어의 경우 특정 패턴에 따라 처리
                let rating, rest;
                if (metaDisplay.startsWith('The total audience')) {
                  rating = 'The total audience'; // "The total audience"
                  rest = parts.slice(3).join(' '); // 나머지 부분
                } else if (metaDisplay.startsWith('12 years of age or older')) {
                  rating = '12 years of age or older'; // "12 years of age or older"
                  rest = parts.slice(5).join(' '); // 나머지 부분
                } else {
                  rating = parts[0]; // "전체관람가", "12세이상" 등 한 단어
                  rest = parts.slice(1).join(' '); // 나머지 부분
                }
                return (
                  <>
                    <span className="modal-rating-badge">{rating}</span> {rest}
                  </>
                );
              })()
            ) : (
              `${content.age_rating}+ | ${content.meta || '2026'} | 120분`
            )}
          </div>

          <div className="modal-button-row">
            <button className="modal-play-btn" onClick={onPlay}>▶ {t('watch')}</button>
            
            {/* 좋아요 버튼: 클릭 시 App.jsx의 handleToggleLike가 실행됩니다. */}
            <button 
              className={`modal-heart-icon-btn ${content.is_liked ? 'active' : ''}`} 
              onClick={onLike}
              title={t('like')}
            >
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                      fill={content.is_liked ? "#e50914" : "none"} 
                      stroke={content.is_liked ? "#e50914" : "#fff"} 
                      strokeWidth="2" />
              </svg>
            </button>
          </div>

          <p className="modal-description-text">{description}</p>
          
          <div className="modal-like-count-text">
            ❤️ {content.like_count || 0} {t('like_count')}
          </div>
        </div>
      </div>
    </div>
  );
}
