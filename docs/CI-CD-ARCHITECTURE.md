# Formation+ CI/CD 파이프라인 아키텍처 설명

## 📐 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        Formation+ 아키텍처                       │
└─────────────────────────────────────────────────────────────────┘

[개발자] ──코드 푸시──> [GitHub Repository]
                            │
                            │ GitHub Actions 트리거
                            ▼
                    ┌───────────────────┐
                    │  CI/CD 파이프라인  │
                    │   (.github/       │
                    │  workflows/ci.yml)│
                    └───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   [Trivy 보안    [Vite 빌드     [AWS 자격증명]
    스캔]         (dist 생성)]    설정]
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌───────────────────┐
                    │   S3 Origin        │
                    │   team-formation- │
                    │   lap-origin-s3   │
                    └───────────────────┘
                            │
                            │ CloudFront가 S3에서 파일 제공
                            ▼
                    ┌───────────────────┐
                    │   CloudFront      │
                    │   Distribution    │
                    └───────────────────┘
                            │
                            │ 캐시 무효화 (/*)
                            ▼
                    ┌───────────────────┐
                    │   사용자 (Browser) │
                    │   www.exampleott  │
                    │   .click          │
                    └───────────────────┘
```

## 🔄 CI/CD 파이프라인 단계별 설명

### 1. 트리거 (Trigger)

```yaml
on:
  push:
    branches:
      - main           # 메인 브랜치 푸시 시
      - "feat/#*"      # feat/# 로 시작하는 브랜치 푸시 시
  workflow_dispatch:   # 수동 실행도 가능
```

**아키텍처 위치:**
- 개발자가 코드를 GitHub에 푸시하면 자동으로 워크플로우가 시작됩니다.
- 이는 Formation+ 전체 시스템의 **자동화된 배포 진입점**입니다.

---

### 2. 환경 설정 (Environment)

```yaml
env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  S3_BUCKET: team-formation-lap-origin-s3
  BUILD_DIR: dist
  CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
```

**아키텍처 연결:**
- `S3_BUCKET`: Frontend 정적 파일이 저장될 S3 Origin 버킷
- `CLOUDFRONT_DISTRIBUTION_ID`: S3 버킷 앞에 있는 CloudFront Distribution ID
- 이 두 개가 연결되어 사용자에게 최적의 속도로 콘텐츠를 제공합니다.

---

### 3. 소스 코드 체크아웃

```yaml
- name: Checkout
  uses: actions/checkout@v4
```

**아키텍처 위치:**
- GitHub Repository에서 최신 코드를 가져옵니다.
- 이 코드는 **Formation+ Frontend의 소스**입니다.

---

### 4. Node.js 환경 설정

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: npm
```

**아키텍처 역할:**
- React + Vite 애플리케이션을 빌드하기 위한 런타임 환경을 준비합니다.
- npm 캐시를 활용하여 빌드 속도를 최적화합니다.

---

### 5. 의존성 설치

```yaml
- name: Install dependencies
  run: npm ci
```

**아키텍처 연결:**
- `package.json`에 정의된 의존성들을 설치합니다:
  - `react`, `react-dom` - UI 프레임워크
  - `video.js` - HLS 비디오 플레이어
  - `axios` - Backend API 통신
  - `i18next` - 다국어 지원

---

### 6. 빌드 (Build)

```yaml
- name: Build
  run: npm run build
```

**아키텍처 변환 과정:**
```
React 소스 코드 (JSX/TSX)
    ↓ Vite 빌드
정적 파일 (HTML/CSS/JS)
    ↓ dist/ 디렉토리에 생성
배포 준비 완료
```

**생성되는 파일:**
- `dist/index.html` - 메인 HTML
- `dist/assets/*.js` - 번들된 JavaScript
- `dist/assets/*.css` - 번들된 CSS
- `dist/assets/*.png` - 이미지 파일

---

### 7. Trivy 보안 스캔

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    format: 'table'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
```

**아키텍처 보안 계층:**
- **보안 게이트**: CRITICAL/HIGH 취약점이 발견되면 빌드 실패
- **목적**: 악성 코드나 취약한 의존성이 프로덕션에 배포되는 것을 방지
- **위치**: S3에 업로드하기 전에 보안 검사를 수행

**실패 시나리오:**
```
Trivy 스캔 실패 → 빌드 중단 → S3 업로드 안 됨 → 사용자에게 배포 안 됨 ✅
```

---

### 8. AWS 자격 증명 설정

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ secrets.AWS_REGION }}
```

**아키텍처 연결:**
- GitHub Actions가 AWS 리소스(S3, CloudFront)에 접근하기 위한 인증입니다.
- **보안**: GitHub Secrets에 저장되어 안전하게 관리됩니다.

---

### 9. S3 업로드 (Sync)

```yaml
- name: Upload to S3 (sync)
  run: |
    echo "Deploying ${BUILD_DIR} -> s3://${S3_BUCKET}"
    aws s3 sync "${BUILD_DIR}" "s3://${S3_BUCKET}" --delete
```

**아키텍처 배포 단계:**

```
GitHub Actions 빌드된 파일 (dist/)
    ↓ aws s3 sync
S3 Origin 버킷 (team-formation-lap-origin-s3)
    ├── index.html
    ├── assets/
    │   ├── main-abc123.js
    │   ├── main-def456.css
    │   └── logo.png
    └── ...
```

**`--delete` 옵션의 의미:**
- S3에 있지만 `dist/`에 없는 파일은 자동 삭제
- **목적**: 불필요한 파일 제거 (예: 이전 빌드의 파일)

**아키텍처 역할:**
- S3는 **Origin 서버** 역할을 합니다.
- CloudFront가 이 버킷에서 파일을 가져와 사용자에게 제공합니다.

---

### 10. CloudFront 캐시 무효화

```yaml
- name: Invalidate CloudFront cache
  if: env.CLOUDFRONT_DISTRIBUTION_ID != ''
  run: |
    echo "Invalidating CloudFront distribution: ${CLOUDFRONT_DISTRIBUTION_ID}"
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
      --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text)
    echo "CloudFront invalidation created: ${INVALIDATION_ID}"
    echo "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
      --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
      --id ${INVALIDATION_ID}
    echo "✅ CloudFront cache invalidation completed!"
```

**아키텍처 캐시 계층:**

```
사용자 (Browser)
    │
    │ 요청: www.exampleott.click/index.html
    ▼
┌─────────────────────────────────────┐
│   CloudFront Edge Location          │
│   (전 세계 여러 위치)                │
│   ┌─────────────────────────────┐  │
│   │  캐시된 파일 (구버전)        │  │
│   │  - index.html (old)         │  │
│   │  - main-abc123.js (old)     │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
    │
    │ 캐시 미스 시 Origin에서 가져옴
    ▼
┌─────────────────────────────────────┐
│   S3 Origin                         │
│   team-formation-lap-origin-s3      │
│   ┌─────────────────────────────┐  │
│   │  최신 파일 (신버전)          │  │
│   │  - index.html (new)         │  │
│   │  - main-def456.js (new)     │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

**캐시 무효화 과정:**

```
1. S3에 새 파일 업로드 완료
   ↓
2. CloudFront에 캐시 무효화 요청 (/*)
   ↓
3. CloudFront가 기존 캐시 삭제
   ↓
4. 다음 요청 시 Origin(S3)에서 최신 파일 가져옴
   ↓
5. 새로운 캐시 생성 (최신 파일)
```

**`--paths "/*"` 의미:**
- 모든 경로의 캐시를 무효화합니다.
- **이유**: Vite는 빌드마다 파일명 해시가 변경되므로 전체 무효화가 안전합니다.

**왜 `wait invalidation-completed`를 사용하나?**
- 무효화가 완료될 때까지 대기하여 **배포의 완전성**을 보장합니다.
- 무효화는 비동기 작업이므로 완료를 확인해야 합니다.

---

## 🏗️ 전체 Formation+ 아키텍처 내 CI/CD 위치

```
┌─────────────────────────────────────────────────────────────┐
│                    Formation+ 전체 아키텍처                  │
└─────────────────────────────────────────────────────────────┘

                    [개발자]
                        │
                        │ 코드 작성 및 푸시
                        ▼
            ┌───────────────────────┐
            │   GitHub Repository   │
            │   Frontend 소스 코드   │
            └───────────────────────┘
                        │
                        │ GitHub Actions (ci.yml)
                        ▼
        ┌───────────────────────────────────┐
        │      CI/CD 파이프라인              │
        │  ┌─────────────────────────────┐  │
        │  │ 1. 코드 체크아웃            │  │
        │  │ 2. Node.js 환경 설정        │  │
        │  │ 3. 의존성 설치              │  │
        │  │ 4. 빌드 (Vite)              │  │
        │  │ 5. 보안 스캔 (Trivy)        │  │
        │  │ 6. AWS 자격 증명            │  │
        │  │ 7. S3 업로드                │  │
        │  │ 8. CloudFront 캐시 무효화   │  │
        │  └─────────────────────────────┘  │
        └───────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────┐              ┌──────────────┐
│  S3 Origin   │◄─────────────│ CloudFront   │
│  (정적 파일)  │   파일 제공   │  (CDN)       │
└──────────────┘              └──────────────┘
        │                               │
        │                               │
        └───────────────┬───────────────┘
                        │
                        │ 사용자 요청
                        ▼
              ┌──────────────────┐
              │   사용자 브라우저 │
              │  www.exampleott  │
              │   .click         │
              └──────────────────┘
                        │
                        │ API 호출
                        ▼
              ┌──────────────────┐
              │  Backend API     │
              │  (FastAPI)       │
              │  api.exampleott  │
              │   .click         │
              └──────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
  ┌─────────┐    ┌──────────┐    ┌──────────┐
  │   RDS   │    │ Keycloak │    │ Meili    │
  │ (MySQL) │    │ (Auth)   │    │ search   │
  └─────────┘    └──────────┘    └──────────┘
```

---

## 🔑 주요 개념 정리

### 1. **Origin vs Edge**
- **Origin (S3)**: 원본 파일이 저장되는 곳
- **Edge (CloudFront)**: 전 세계에 분산된 캐시 서버

### 2. **캐시 무효화가 필요한 이유**
- CloudFront는 **캐시를 재사용**하여 속도를 높입니다.
- 새 파일이 S3에 올라가도 **기존 캐시가 남아있으면** 사용자는 구버전을 볼 수 있습니다.
- 무효화로 **강제로 최신 파일을 가져오도록** 합니다.

### 3. **왜 S3를 거쳐야 하나?**
- CloudFront는 **Origin 서버**가 필요합니다.
- S3는 **정적 파일 호스팅**에 최적화되어 있습니다.
- **비용 효율적**이고 **확장성**이 뛰어납니다.

### 4. **CI/CD 파이프라인의 역할**
- **자동화**: 개발자가 푸시만 하면 자동 배포
- **보안**: Trivy로 취약점 검사
- **속도**: S3 + CloudFront로 전 세계 사용자에게 빠른 속도 제공
- **신뢰성**: 무효화 완료 확인으로 배포 완전성 보장

---

## 📊 배포 흐름 타임라인

```
시간 →
0:00 - 개발자가 코드 푸시
0:01 - GitHub Actions 시작
0:10 - 빌드 완료
0:15 - Trivy 스캔 완료 (통과)
0:20 - S3 업로드 완료
0:25 - CloudFront 캐시 무효화 시작
0:30 - 캐시 무효화 완료 대기 중...
1:00 - 캐시 무효화 완료 ✅
      → 사용자가 최신 버전을 볼 수 있음!
```

---

## 🎯 핵심 포인트

1. **자동화**: 코드 푸시 → 자동 배포
2. **보안**: Trivy로 취약점 사전 차단
3. **속도**: S3 + CloudFront로 전 세계 최적화
4. **완전성**: 캐시 무효화 완료 대기로 배포 확실성 보장
5. **신뢰성**: 각 단계의 성공/실패를 명확히 확인

---

Made with ❤️ by Formation+ Team
