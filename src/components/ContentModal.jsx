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
      if (content.title === '우리 생애 최고의 순간' || content.title === 'Forever the Moment') {
        return 'All Audiences | 2008 · Sports/Drama · 2 hours 4 minutes';
      } else if (content.title === '우리들의 일그러진 영웅' || content.title === 'Our Twisted Hero') {
        return 'All Audiences | 1992 · Drama · 1 hour 58 minutes';
      } else if (content.title === '우리들의 행복한 시간' || content.title === 'Our Happy Time') {
        return 'Rated 15 and over | 2006 · Romance/Drama · 2 hours';
      } else if (content.title === '무한도전' || content.title === 'Infinite Challenge') {
        return '12 years of age or older | 1992 · Entertainment · Completion';
      } else if (content.title === 'tiny') {
        return 'Overall audience | Free test · promotional video';
      }
    }
    
    // 한국어일 때는 원본 meta_display 사용
    return content.meta_display;
  };
  
  const getDescription = () => {
    // 영어일 때 특정 제목에 대해 다른 설명 표시
    if (i18n.language === 'en') {
      if (content.title === '우리 생애 최고의 순간' || content.title === 'Forever the Moment') {
        return "In an effort to revive the national women's handball team, former star players from its glory days are brought together once again. Each player has a strong personality, and frequent conflicts make unity difficult to achieve. After many ups and downs, the players—each carrying the weight of their own complicated lives—gradually accept one another and begin to come together as a tightly bonded team.";
      } else if (content.title === '우리들의 일그러진 영웅' || content.title === 'Our Twisted Hero') {
        return "Now in his forties, Han Byeong-tae hears of his former teacher's death, which brings back memories of his childhood. Thirty years earlier, in a small elementary school classroom, he witnessed the absurd and oppressive power wielded by Um Seok-dae, the class president who ruled his classmates through fear and obedience.";
      } else if (content.title === '우리들의 행복한 시간' || content.title === 'Our Happy Time') {
        return 'After her third suicide attempt, Yujeong goes to a detention center as part of a volunteer program with her aunt, Sister Monica. There, she meets Jung Yunsu, a death row inmate who coldly pushes her away. Yujeong later realizes that Yunsu is the singer who once sang the national anthem when she was a child.';
      }
    }
    
    // 한국어일 때는 원본 description 사용
    return content.description;
  };
  
  const metaDisplay = getMetaDisplay();
  const description = getDescription();
  
  // 언어에 따라 제목 다르게 표시
  const getTitle = () => {
    if (i18n.language === 'en') {
      if (content.title === '우리 생애 최고의 순간') {
        return 'Forever the Moment';
      } else if (content.title === '우리들의 일그러진 영웅') {
        return 'Our Twisted Hero';
      } else if (content.title === '우리들의 행복한 시간') {
        return 'Our Happy Time';
      } else if (content.title === '무한도전') {
        return 'Infinite Challenge';
      }
    }
    return content.title;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* e.stopPropagation()을 넣어야 모달 내부를 클릭해도 창이 안 닫힙니다. */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        
        <div className="modal-inner-body">
          <h2 className="modal-title">{getTitle()}</h2>
          
          <div className="modal-meta-info">
            {metaDisplay ? (
              // meta_display 형식: "전체관람가 1992년 ‧ 드라마 ‧ 1시간 58분" 또는 "Overall audience + | 1992 · Drama · 1 hour 58 minutes | 120 minutes"
              (() => {
                // 영어일 때는 | 구분자로 파싱
                if (i18n.language === 'en' && metaDisplay.includes('|')) {
                  const parts = metaDisplay.split('|').map(p => p.trim());
                  return (
                    <>
                      <span className="modal-rating-badge">{parts[0]}</span> {parts[1]} {parts[2] ? `| ${parts[2]}` : ''}
                    </>
                  );
                }
                
                // 한국어일 때는 기존 로직 사용
                // "전체관람가 1992년 ‧ 드라마 ‧ 1시간 58분" 형식 또는 "전체관람가+ | 1992년 ‧ 드라마 ‧ 1시간 58분 | 120 minutes" 형식
                if (metaDisplay.includes('|')) {
                  // | 구분자가 있으면 파싱
                  const parts = metaDisplay.split('|').map(p => p.trim());
                  // parts[2]는 "120 minutes"이므로 한국어에서는 표시하지 않음
                  return (
                    <>
                      <span className="modal-rating-badge">{parts[0]}</span> {parts[1]}
                    </>
                  );
                } else {
                  // | 구분자가 없으면 기존 로직 (하위 호환성)
                  const parts = metaDisplay.split(' ');
                  let rating, rest;
                  if (metaDisplay.startsWith('전체관람가')) {
                    rating = '전체관람가+';
                    rest = parts.slice(1).join(' ');
                  } else if (metaDisplay.startsWith('12세이상')) {
                    rating = '12세이상';
                    rest = parts.slice(1).join(' ');
                  } else if (metaDisplay.startsWith('15세 이상 관람가')) {
                    rating = '15세 이상 관람가';
                    rest = parts.slice(3).join(' ');
                  } else {
                    rating = parts[0];
                    rest = parts.slice(1).join(' ');
                  }
                  return (
                    <>
                      <span className="modal-rating-badge">{rating}</span> {rest}
                    </>
                  );
                }
              })()
            ) : (
              i18n.language === 'en' 
                ? `${content.age_rating}+ | ${content.meta || '2026'} | 120 minutes`
                : `${content.age_rating}+ | ${content.meta || '2026'} | 120분`
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
