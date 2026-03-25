# HALLAON Workspace

탐라영재관 자율회 **한라온**의 프로젝트 관리 및 협업 플랫폼

## 접속 정보

- **샌드박스 URL**: https://3000-iiiffmip89qidjz10wzfc-ea026bf9.sandbox.novita.ai
- **로그인**: 이름(ID) + 비밀번호 입력 (Supabase users 테이블 기반)
  - 예시: 홍길동 / 1200
  
## 현재 구현된 기능

### 핵심 기능
- ✅ **로그인/로그아웃** - Supabase users 테이블 인증 (name + password)
- ✅ **Realtime 업데이트** - Supabase 실시간 구독으로 다중 사용자 동기화
- ✅ **접속자 현황** - Supabase Presence로 실시간 접속자 표시
- ✅ **라이트/다크 모드** - next-themes 기반 테마 전환
- ✅ **인트로 애니메이션** - 로고 페이드인 애니메이션

### 대시보드 (`/dashboard`)
- 전체/진행중/막힘/완료 메트릭 카드
- 프로젝트 완료율 진행 바
- 팀별 업무 현황 (PM/CD/FS/DM/OPS)
- 안건 현황 요약
- 상태별 분포 파이 차트
- 담당자별 태스크 막대 차트
- 마감 임박 업무 (7일 이내) 테이블

### 업무 및 WBS (`/tasks`)
- ✅ PERT 기반 기대시간(TE) 자동 계산 (O + 4M + P) / 6
- ✅ CPM 핵심 경로 식별 (WBS 코드 기반 선행 업무)
- ✅ 업무 생성/수정/삭제
- ✅ 인라인 상태 변경
- ✅ 팀/상태 필터링
- ✅ **Discord 전송** 버튼 (Send 아이콘)
- 상태별 색상 뱃지

### 간트 차트 (`/gantt`)
- CPM 핵심 경로 붉은 막대 강조
- 오늘 날짜 세로선
- 팀별 색상 구분
- 완료 업무 숨기기 / 팀 필터

### 캘린더 (`/calendar`)
- FullCalendar 기반 월간/주간 뷰
- 업무/안건/회의록 통합 표시
- 정기 일정 등록 (1회/매주/격주/매월)
- 이벤트 클릭 상세 정보 팝업

### 안건 (`/agendas`)
- ✅ 안건 생성/수정/삭제
- ✅ 상태 인라인 변경
- ✅ **Discord 전송** 버튼
- 카드/목록 뷰 전환
- 검색 + 팀/상태 필터

### 의사결정 모델 (`/decisions`)
- 가중치 평가 알고리즘 (기준 + 가중치)
- 대안 입력 + 1~10점 평가
- 최적 대안 자동 추천
- 결과 막대 차트
- 의사결정 기록 저장/삭제

### 문서 허브 (`/docs`)
- ✅ 폴더별(전체회의/PM/CD/FS/DM/OPS) 문서 분류
- ✅ 마크다운 에디터 + 미리보기 뷰
- ✅ 인라인 제목 편집 (클릭)
- ✅ 자동 저장 (1.5초 debounce)
- ✅ 문서 생성/삭제
- 검색 + 카테고리 필터

### 구글 드라이브 자료실 (`/drive`)
- GOOGLE_SERVICE_ACCOUNT_JSON 설정 시 파일 목록 표시
- 파일 열기/다운로드
- 미설정 시 안내 메시지 표시

## 데이터 구조

### Supabase 테이블
| 테이블 | 주요 컬럼 |
|--------|-----------|
| `users` | name, password, role |
| `tasks` | id, title, assignee, team, status, wbs_code, predecessor, opt_time, prob_time, pess_time, exp_time, start_date, end_date, is_sent |
| `agendas` | id, title, proposer, team, status, proposed_date, is_sent |
| `meetings` | id, category, date, title, author_id, content |
| `decisions` | id, agenda_id, criteria, alternatives, best_choice, created_at |

## 환경 변수

```env
VITE_SUPABASE_URL=https://pqhkyapghjrfbls.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_w5JSBR3VGRONA_fIUW4XaV
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}  # 선택
GOOGLE_DRIVE_FOLDER_ID=...  # 선택
```

## 기술 스택

- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **UI**: 노션 스타일 커스텀 컴포넌트
- **Backend**: Express.js + Vite Dev Server
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **Charts**: Recharts
- **Calendar**: FullCalendar
- **Animation**: Motion (Framer Motion)
- **Theme**: next-themes

## 로컬 실행

```bash
npm install
cp .env.example .env  # 환경 변수 입력
npm run build
npm run dev
```

## 배포 상태

- **플랫폼**: Sandbox (Novita AI)
- **상태**: ✅ 실행 중
- **마지막 업데이트**: 2026-03-24
