import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: {
        translation: {
          "home": "홈",
          "watchlist": "관심 콘텐츠",
          "movies": "영화",
          "series": "시리즈",
          "originals": "오리지널",
          "play": "재생하기",
          "info": "상세 정보",
          "recommend_title": "Formation+ 오리지널 & 추천",
          "search_placeholder": "제목, 캐릭터 또는 장르로 검색하세요",
          "close": "닫기"
        }
      },
      en: {
        translation: {
          "home": "Home",
          "watchlist": "My List",
          "movies": "Movies",
          "series": "Series",
          "originals": "Originals",
          "play": "Play",
          "info": "More Info",
          "recommend_title": "Formation+ Originals & Recommended",
          "search_placeholder": "Titles, characters, or genres",
          "close": "Close"
        }
      }
    },
    fallbackLng: "ko",
    interpolation: { escapeValue: false }
  });

export default i18n;
