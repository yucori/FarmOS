# 코딩 컨벤션

## 전체 프로젝트

### Git Hooks (Pre-commit)
- **설치**: `pre-commit install` (프로젝트 루트에서 한 번만 실행)
- **동작**: 커밋 전에 자동으로 코드 포맷팅 및 린팅 실행
- **수정된 파일**: hooks가 파일을 자동으로 수정한 후 다시 커밋해야 함

---

## Backend (Python)

### Black - Code Formatter
```bash
# 수동 실행
cd backend
uv run black .

# 특정 파일만
uv run black app/api/auth.py
```

**설정:**
- Line length: 100 characters
- 자동 포맷팅 (선택지 없음)

### Ruff - Linter
```bash
# 자동 수정
uv run ruff check --fix .

# 확인만
uv run ruff check .
```

---

## Frontend (TypeScript/React)

### ESLint
```bash
# 린팅 실행
npm run lint

# 자동 수정
npm run lint -- --fix
```

**설정:**
- ESLint 9.x + TypeScript ESLint
- React Hooks 플러그인
- React Refresh 지원

---

---

## Rules (Code Convention Enforcement)

모든 코드 변경사항은 아래 규칙들을 **자동으로 검증 및 적용**합니다.

### Backend Python Rules
- **Black**: 100자 라인 길이로 자동 포맷팅
- **Ruff**: 린팅 규칙 자동 수정
- **실행 시점**: Git commit 전 (pre-commit hook)

### Frontend TypeScript/React Rules
- **ESLint**: ESLint 9.x + TypeScript ESLint 규칙 준수
- **실행 시점**: Git commit 전 (pre-commit hook)

**구현 방식:**
- 이 Rules들은 `.pre-commit-config.yaml`에 정의된 git pre-commit hooks를 통해 자동으로 실행됩니다
- 커밋 시도 시 hook이 자동으로 실행되며, 규칙 위반 시 커밋이 차단됩니다
- 파일이 수정되면 수정된 파일을 다시 add한 후 커밋하면 됩니다

---

## Pre-commit Hook 워크플로우

1. `git add` 로 변경사항 staged
2. `git commit` 실행
3. **자동 실행:**
   - **Backend (Python)**: Black 포맷팅 + Ruff 린팅
   - **Frontend (TypeScript/React)**: ESLint 자동 수정
4. **파일이 수정된 경우:**
   ```bash
   # 수정된 파일 확인
   git status
   
   # 수정된 파일 다시 add
   git add .
   
   # 커밋 다시 시도
   git commit
   ```

---

## 초기 설정

### 첫 실행 시 (프로젝트 루트)
```bash
# Pre-commit hooks 설치
pre-commit install

# (선택) 기존 코드에 포맷팅 적용
pre-commit run --all-files
```

### Backend 개발 환경 설정
```bash
cd backend

# 의존성 설치 (Black, Ruff, 기타 모두 포함)
uv pip install -e .
```
