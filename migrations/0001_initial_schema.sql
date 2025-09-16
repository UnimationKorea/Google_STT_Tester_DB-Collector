-- 사용자 정보 테이블
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username TEXT UNIQUE,
    age INTEGER,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 발화 대상 문장/단어 테이블
CREATE TABLE IF NOT EXISTS target_sentences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    type TEXT CHECK (type IN ('sentence', 'word')) DEFAULT 'sentence',
    difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    category TEXT,
    expected_variations TEXT, -- JSON array of expected pronunciation variations
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 음성 인식 세션 테이블
CREATE TABLE IF NOT EXISTS recognition_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    target_sentence_id INTEGER,
    audio_duration REAL, -- 오디오 길이 (초)
    stt_model TEXT DEFAULT 'google', -- 사용한 STT 모델
    stt_language TEXT DEFAULT 'en-US', -- 언어 설정
    session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (target_sentence_id) REFERENCES target_sentences(id) ON DELETE CASCADE
);

-- 인식 결과 테이블
CREATE TABLE IF NOT EXISTS recognition_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    target_text TEXT NOT NULL, -- 원본 문장
    recognized_text TEXT, -- 인식된 텍스트
    confidence_score REAL, -- 신뢰도 점수 (0-1)
    is_correct BOOLEAN, -- 정답 여부
    alternatives TEXT, -- JSON array of alternative transcriptions
    error_details TEXT, -- 오류 상세 정보
    processing_time REAL, -- 처리 시간 (ms)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES recognition_sessions(id) ON DELETE CASCADE
);

-- 인식률 통계 테이블
CREATE TABLE IF NOT EXISTS recognition_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_sentence_id INTEGER,
    user_id TEXT,
    total_attempts INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    accuracy_rate REAL DEFAULT 0.0,
    avg_confidence REAL DEFAULT 0.0,
    date DATE DEFAULT (DATE('now')),
    hour INTEGER DEFAULT (strftime('%H', 'now')),
    FOREIGN KEY (target_sentence_id) REFERENCES target_sentences(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(target_sentence_id, user_id, date, hour)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON recognition_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_target_id ON recognition_sessions(target_sentence_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON recognition_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_results_session_id ON recognition_results(session_id);
CREATE INDEX IF NOT EXISTS idx_results_is_correct ON recognition_results(is_correct);
CREATE INDEX IF NOT EXISTS idx_stats_sentence_id ON recognition_stats(target_sentence_id);
CREATE INDEX IF NOT EXISTS idx_stats_user_id ON recognition_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_stats_date ON recognition_stats(date);

-- 트리거: users 테이블 updated_at 자동 업데이트
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 트리거: target_sentences 테이블 updated_at 자동 업데이트
CREATE TRIGGER IF NOT EXISTS update_target_sentences_timestamp 
AFTER UPDATE ON target_sentences
BEGIN
    UPDATE target_sentences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 트리거: recognition_stats 자동 업데이트
CREATE TRIGGER IF NOT EXISTS update_recognition_stats
AFTER INSERT ON recognition_results
BEGIN
    INSERT OR REPLACE INTO recognition_stats (
        target_sentence_id, 
        user_id, 
        date, 
        hour,
        total_attempts,
        correct_count,
        accuracy_rate,
        avg_confidence
    )
    SELECT 
        rs.target_sentence_id,
        rs.user_id,
        DATE(rs.session_date),
        strftime('%H', rs.session_date),
        COALESCE(stats.total_attempts, 0) + 1,
        COALESCE(stats.correct_count, 0) + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        CAST(COALESCE(stats.correct_count, 0) + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END AS REAL) / 
            (COALESCE(stats.total_attempts, 0) + 1),
        (COALESCE(stats.avg_confidence * stats.total_attempts, 0) + COALESCE(NEW.confidence_score, 0)) / 
            (COALESCE(stats.total_attempts, 0) + 1)
    FROM recognition_sessions rs
    LEFT JOIN recognition_stats stats 
        ON stats.target_sentence_id = rs.target_sentence_id 
        AND stats.user_id = rs.user_id
        AND stats.date = DATE(rs.session_date)
        AND stats.hour = strftime('%H', rs.session_date)
    WHERE rs.id = NEW.session_id;
END;