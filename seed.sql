-- 샘플 발화 대상 문장 삽입
INSERT OR IGNORE INTO target_sentences (content, type, difficulty_level, category, expected_variations) VALUES 
    ('Hello, how are you?', 'sentence', 'easy', 'greeting', '["Hello how are you", "Hello how r u", "Hello how are u"]'),
    ('What is your name?', 'sentence', 'easy', 'introduction', '["What is ur name", "Whats your name", "What your name"]'),
    ('I like to play soccer', 'sentence', 'medium', 'activity', '["I like play soccer", "I like to play soccor", "I like playing soccer"]'),
    ('The weather is nice today', 'sentence', 'medium', 'weather', '["The weather nice today", "Weather is nice today", "The weathers nice today"]'),
    ('Can you help me please?', 'sentence', 'medium', 'request', '["Can u help me please", "Can you help me", "Could you help me please"]'),
    ('apple', 'word', 'easy', 'fruit', '["aple", "appel", "appl"]'),
    ('banana', 'word', 'easy', 'fruit', '["bananna", "bannana", "banan"]'),
    ('computer', 'word', 'medium', 'technology', '["computor", "computa", "compoter"]'),
    ('elephant', 'word', 'hard', 'animal', '["elefant", "elephent", "eliphant"]'),
    ('Thank you very much', 'sentence', 'easy', 'courtesy', '["Thank u very much", "Thanks very much", "Thank you so much"]');

-- 샘플 사용자 데이터 삽입
INSERT OR IGNORE INTO users (id, username, age, gender) VALUES 
    ('user001', 'Alice', 8, 'female'),
    ('user002', 'Bob', 10, 'male'),
    ('user003', 'Charlie', 7, 'male'),
    ('user004', 'Diana', 9, 'female'),
    ('user005', 'Eve', 11, 'other');