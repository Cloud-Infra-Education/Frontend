# Formation+ Frontend

OTT 플랫폼 Formation+의 프론트엔드 애플리케이션입니다.

## 📋 프로젝트 개요

Formation+는 React + Vite 기반의 모던한 OTT 스트리밍 서비스 프론트엔드입니다. 디즈니 플러스 스타일의 UI/UX를 제공하며, Backend API와 완전히 연동되어 있습니다.

## 🚀 시작하기

### 필수 요구사항

- Node.js 20 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

## 🏗️ 프로젝트 구조

```
Frontend/
├── src/
│   ├── components/
│   │   ├── LoginOverlay.jsx      # 로그인/회원가입 화면
│   │   ├── ContentModal.jsx      # 컨텐츠 상세 모달
│   │   └── SmartPlayer.jsx       # 비디오 플레이어 (video.js)
│   ├── App.jsx                   # 메인 앱 컴포넌트
│   ├── App.css                   # 메인 스타일
│   └── main.jsx                  # 진입점
├── public/                       # 정적 파일
├── .github/workflows/            # CI/CD 워크플로우
│   └── ci.yml                    # 빌드 및 배포 파이프라인
└── package.json
```

## 🎨 주요 기능

### 1. 인증 시스템
- 회원가입/로그인
- JWT 토큰 기반 인증
- 자동 토큰 만료 처리

### 2. 컨텐츠 브라우징
- Hero 섹션 자동 슬라이더 (5초마다)
- 카테고리별 가로 스크롤 행
- 디즈니 플러스 스타일 UI

### 3. 시청 기능
- 비디오 플레이어 (video.js)
- 이어보기 기능 (시청 기록 기반)
- 시청 기록 자동 저장

### 4. 검색 기능
- 실시간 검색 (Meilisearch 연동)
- 카테고리별 검색 결과 표시
- 가로 스크롤 썸네일 리스트

### 5. 좋아요 기능
- 컨텐츠 좋아요/취소
- 좋아요 수 실시간 표시

## 🔌 Backend API 연동

### API Base URL
```
https://api.exampleott.click/api/v1
```

### 주요 API 엔드포인트

#### 인증
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인

#### 컨텐츠
- `GET /contents` - 컨텐츠 목록
- `GET /contents/{id}` - 컨텐츠 상세
- `GET /contents/{id}/video-assets/s3/list` - 영상 파일 목록

#### 시청 기록
- `GET /watch-history` - 시청 기록 목록
- `GET /watch-history/{content_id}` - 특정 컨텐츠 시청 기록
- `POST /watch-history` - 시청 기록 저장/업데이트

#### 좋아요
- `POST /contents/{id}/likes` - 좋아요
- `DELETE /contents/{id}/likes` - 좋아요 취소

#### 검색
- `GET /search?q={query}` - 컨텐츠 검색

## 🎨 디자인 시스템

### 색상 팔레트
- **메인 배경**: `#040714` (깊은 남색)
- **액센트 색상**: `#00d4ff` (하늘색), `#0077cc` (파란색)
- **텍스트**: `#ffffff` (흰색)

### 주요 스타일
- **둥근 모서리**: `border-radius: 8px~20px`
- **그림자 효과**: 입체감 있는 다층 box-shadow
- **전환 애니메이션**: `cubic-bezier(0.4, 0, 0.2, 1)`

## 🔄 CI/CD 파이프라인

GitHub Actions를 통한 자동 배포:

1. **Trivy 보안 스캔** - CRITICAL/HIGH 취약점 검사
2. **Frontend 빌드** - Vite 빌드 실행
3. **S3 업로드** - `team-formation-lap-origin-s3` 버킷에 배포
4. **CloudFront 캐시 무효화** - 자동 캐시 삭제

### 워크플로우 트리거
- `main` 브랜치 푸시
- `feat/#*` 브랜치 푸시
- 수동 실행 (workflow_dispatch)

## 📦 주요 의존성

```json
{
  "react": "^18.3.1",
  "vite": "^5.4.8",
  "axios": "^1.13.2",
  "video.js": "^8.23.4",
  "react-i18next": "^16.5.3"
}
```

## 🌐 다국어 지원

i18next를 사용한 다국어 지원 (한국어/영어)

## 🔐 환경 변수

프로덕션 환경에서 다음 환경 변수가 필요합니다:

- `VITE_API_BASE_URL` - Backend API 주소 (선택사항, 기본값: `https://api.exampleott.click/api/v1`)

## 📝 주요 작업 내역

### 2026-01-17
- ✅ 디즈니 플러스 스타일 UI 적용
- ✅ Hero 섹션 자동 슬라이더 구현
- ✅ 로그인 화면 디자인 개선
- ✅ 검색 화면 카테고리별 행 구성
- ✅ 메인 화면 가로 스크롤 행 추가
- ✅ CloudFront 캐시 무효화 단계 추가
- ✅ Backend API 완전 연동

## 🤝 기여자

- @sumin2002
- @MaxJagger

## 📄 라이선스

이 프로젝트는 팀 프로젝트입니다.

## 🔗 관련 링크

- **Backend API 문서**: https://api.exampleott.click/docs
- **GitHub 저장소**: https://github.com/Cloud-Infra-Education/Frontend
- **Swagger UI**: https://api.exampleott.click/docs

---

Made with ❤️ by Formation+ Team
