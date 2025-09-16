# 구글 음성인식 테스터 및 DB 수집시스템

## 프로젝트 개요
- **이름**: STT Tester System
- **목표**: 어린이 영어 발화 훈련을 위한 음성인식 정확도 측정 및 튜닝 데이터 수집
- **주요 기능**: 
  - 음성 녹음 및 Google Speech-to-Text API 연동
  - 발화 문장/단어 관리 및 정답률 분석
  - 사용자별, 시간대별 성능 통계
  - CSV 데이터 내보내기

## 최신 업데이트 (2025-09-16 v2)
✅ 문장 관리에 **삭제 기능** 추가 - 각 문장 옆 삭제 버튼
✅ 난이도/카테고리를 **레벨(3A~H)/세트(1~20)**로 완전 변경
✅ 문장 목록을 **레벨-세트-내용-타입** 순으로 표시
✅ 대시보드 정답률을 **높은 순서**로 정렬 (내림차순)
✅ CSV 다운로드 버튼을 **상단 사용자 선택 영역**으로 이동
✅ **문장별/사용자별 상세 통계 테이블** 추가
✅ 통계 수치와 그래프 분리 표시
✅ **최근 인식 결과를 오류만 표시**하도록 변경
✅ 정답/오답 판정 로직 개선 (구두점 무시)

## 현재 구현된 기능
✅ 사용자 관리 (등록, 조회)
✅ 발화 대상 문장/단어 관리
✅ 음성 녹음 기능 (브라우저 마이크 사용)
✅ Google Speech-to-Text API 연동
✅ Web Speech API 지원 (Chrome/Edge)
✅ Google STT 상세 옵션 설정
  - 언어 선택 (영어, 한국어, 일본어, 중국어 등)
  - 모델 선택 (Latest Long, Short, Command, Phone Call 등)
  - 자동 구두점 추가 옵션
  - 향상된 모델 사용 옵션
✅ 인식 결과 저장 및 정답률 계산 (구두점 무시)
✅ 대시보드 (문장별/시간대별 통계)
✅ CSV 데이터 내보내기 (결과/통계)
✅ D1 Database 스키마 및 트리거

## 기능별 API 엔드포인트

### 사용자 관리
- `GET /api/users` - 전체 사용자 조회
- `POST /api/users` - 새 사용자 등록
  - Parameters: `username`, `age`, `gender`

### 문장/단어 관리
- `GET /api/sentences` - 문장 목록 조회
  - Query: `type` (sentence/word), `category`
- `POST /api/sentences` - 새 문장 추가
  - Parameters: `content`, `type`, `difficulty_level`, `category`

### 음성 인식
- `POST /api/speech-to-text` - 음성 파일 인식
  - FormData: `audio`, `userId`, `targetSentenceId`, `language`

### 통계 및 결과
- `GET /api/results` - 인식 결과 조회
  - Query: `userId`, `sentenceId`, `limit`
- `GET /api/stats` - 통계 데이터 조회
  - Query: `groupBy` (sentence/user/hour)

### 데이터 내보내기
- `GET /api/export/csv` - CSV 다운로드
  - Query: `type` (results/stats)

## 미구현 기능
- [ ] 정답 후보군(variants) 기반 튜닝 로직
- [ ] 발화 교정 피드백 제공
- [ ] 오디오 파일 저장 (R2 Storage)
- [ ] 다국어 지원 확장
- [ ] 실시간 음성 스트리밍 인식
- [ ] 사용자 권한 관리 (인증/인가)

## 개발 추천 사항
1. **Google API Key 설정 필요**
   - Google Cloud Console에서 Speech-to-Text API 활성화
   - API Key 발급 후 `.dev.vars` 파일에 설정
   
2. **프로덕션 배포 시**
   - `wrangler d1 create stt-tester-db` 실행하여 프로덕션 DB 생성
   - `wrangler pages secret put GOOGLE_API_KEY` 로 API 키 설정
   
3. **성능 최적화**
   - 대용량 데이터 처리를 위한 페이징 구현
   - 캐싱 전략 도입 (KV Storage 활용)
   
4. **보안 강화**
   - 사용자 인증 시스템 추가
   - Rate limiting 구현
   - CORS 정책 세부 설정

## 기술 스택
- **Frontend**: HTML5, TailwindCSS, Chart.js, Vanilla JavaScript
- **Backend**: Hono Framework, TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **API**: Google Speech-to-Text API
- **Platform**: Cloudflare Pages

## 데이터 모델

### Users
- `id`: 고유 ID
- `username`: 사용자명
- `age`: 나이
- `gender`: 성별

### Target Sentences
- `id`: 자동 증가 ID
- `content`: 문장/단어 내용
- `type`: sentence/word
- `difficulty_level`: easy/medium/hard
- `category`: 카테고리
- `expected_variations`: 예상 발음 변형 (JSON)

### Recognition Sessions
- `id`: 세션 ID
- `user_id`: 사용자 참조
- `target_sentence_id`: 문장 참조
- `audio_duration`: 오디오 길이
- `stt_model`: 사용 모델
- `session_date`: 세션 날짜

### Recognition Results
- `id`: 결과 ID
- `session_id`: 세션 참조
- `target_text`: 원본 텍스트
- `recognized_text`: 인식된 텍스트
- `confidence_score`: 신뢰도 점수
- `is_correct`: 정답 여부
- `processing_time`: 처리 시간

## 사용 방법

### 로컬 개발
```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npm run db:migrate:local

# 샘플 데이터 삽입
npm run db:seed

# 개발 서버 시작
npm run build
pm2 start ecosystem.config.cjs

# 브라우저에서 접속
http://localhost:3000
```

### 사용 순서
1. **사용자 등록**: "사용자 관리" 탭에서 새 사용자 추가
2. **사용자 선택**: 상단 드롭다운에서 사용자 선택
3. **문장 선택**: "음성 녹음" 탭에서 발화할 문장 선택
4. **녹음하기**: 마이크 버튼을 눌러 녹음 시작/종료
5. **결과 확인**: 인식 결과 모달에서 정답 여부 확인
6. **통계 보기**: "대시보드" 탭에서 전체 통계 확인
7. **데이터 내보내기**: CSV 다운로드 버튼으로 데이터 추출

## 배포
- **Platform**: Cloudflare Pages (예정)
- **Status**: ❌ 미배포
- **Last Updated**: 2025-09-16

## 주의사항
- Google Speech-to-Text API Key가 필요합니다
- 브라우저 마이크 권한이 필요합니다
- Chrome, Edge 등 최신 브라우저 사용을 권장합니다
- 음성 녹음은 WEBM 포맷으로 전송됩니다