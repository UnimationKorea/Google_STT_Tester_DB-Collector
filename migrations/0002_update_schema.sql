-- 난이도와 카테고리를 레벨과 세트로 변경
ALTER TABLE target_sentences ADD COLUMN level TEXT;
ALTER TABLE target_sentences ADD COLUMN set_number INTEGER;

-- 기존 데이터 마이그레이션 (옵션)
UPDATE target_sentences SET level = 'B' WHERE difficulty_level = 'easy';
UPDATE target_sentences SET level = 'D' WHERE difficulty_level = 'medium';
UPDATE target_sentences SET level = 'F' WHERE difficulty_level = 'hard';
UPDATE target_sentences SET set_number = 1 WHERE set_number IS NULL;

-- 나중에 기존 컬럼 삭제 (선택사항)
-- ALTER TABLE target_sentences DROP COLUMN difficulty_level;
-- ALTER TABLE target_sentences DROP COLUMN category;