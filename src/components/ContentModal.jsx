import React from "react";
import "./ContentModal.css";

export default function ContentModal({ content, onClose, onPlay, onLike }) {
  if (!content) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* e.stopPropagation()을 넣어야 모달 내부를 클릭해도 창이 안 닫힙니다. */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        
        <div className="modal-inner-body">
          <h2 className="modal-title">{content.title}</h2>
          
          <div className="modal-meta-info">
            {content.age_rating}+ | {content.meta || '2026'} | 120분
          </div>

          <div className="modal-button-row">
            <button className="modal-play-btn" onClick={onPlay}>▶ 시청하기</button>
            
            {/* 좋아요 버튼: 클릭 시 App.jsx의 handleToggleLike가 실행됩니다. */}
            <button 
              className={`modal-heart-icon-btn ${content.is_liked ? 'active' : ''}`} 
              onClick={onLike}
              title="좋아요"
            >
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
                      fill={content.is_liked ? "#e50914" : "none"} 
                      stroke={content.is_liked ? "#e50914" : "#fff"} 
                      strokeWidth="2" />
              </svg>
            </button>
          </div>

          <p className="modal-description-text">{content.description}</p>
          
          <div className="modal-like-count-text">
            ❤️ {content.like_count || 0}명이 이 콘텐츠를 좋아합니다
          </div>
        </div>
      </div>
    </div>
  );
}
