-- Chord Viewer Seed Data
-- Version: 1.0
-- Created: 2026-10-20

USE chord_viewer;

-- Start transaction for data consistency
START TRANSACTION;

-- Insert labels (safe insert with IGNORE to avoid duplicates)
INSERT IGNORE INTO labels (name, color, instrument) VALUES
  ('Piano Worship', '#3b82f6', 'PIANO'),
  ('Rock', '#ef4444', 'GUITAR'),
  ('Acoustic', '#10b981', 'GUITAR'),
  ('Beginner', '#f59e0b', 'OTHER'),
  ('Ukulele', '#8b5cf6', 'UKULELE'),
  ('Worship', '#6366f1', 'OTHER'),
  ('Classic Rock', '#dc2626', 'GUITAR'),
  ('Folk', '#059669', 'GUITAR'),
  ('Blues', '#1d4ed8', 'GUITAR'),
  ('Christmas', '#e11d48', 'PIANO');

-- Insert sample songs with chord notation
-- Note: Using original chord progressions to avoid copyright issues

INSERT IGNORE INTO songs (title, artist, song_key, capo, tempo, difficulty, content, notes) VALUES
  (
    'Morning Light',
    'Sample Artist',
    'C',
    0,
    120,
    'BEGINNER',
    '[C]Morning light, shining [G]bright
[Am]Everything feels [F]right
[C]Birds are singing, [G]bells are ringing
[Am]What a beautiful [F]sight

[C]Simple chords for [G]practice
[Am]Easy to play [F]along
[C]Keep on strumming, [G]keep on humming
[Am]This is our [F]song',
    'A simple practice song for beginners. Great for learning basic chord changes.'
  ),
  (
    'River Flow',
    'Another Artist',
    'G',
    3,
    95,
    'INTERMEDIATE',
    '[G]Down by the river, [C]where the waters flow
[G]Gentle current, [D]moving slow
[Em]Whispering willows, [C]in the evening glow
[G]Peaceful feelings, [D]that I know

[G]Fingerpicking [C]pattern here
[G]Add some hammer-ons [D]to make it clear
[Em]Practice makes it [C]smooth and dear
[G]Music takes away the [D]fear',
    'Intermediate fingerstyle piece. Practice the hammer-ons and pull-offs.'
  ),
  (
    'Mountain Trail',
    'Folk Trio',
    'D',
    2,
    110,
    'ADVANCED',
    '[D]Climbing up the [A]mountain trail
[Bm]Breathing in the [G]fresh mountain air
[D]Every step tells a [A]different tale
[F#m]Leaving behind [Bm]every care

[D]Complex chords with [A]add9 extensions
[Bm]Try some sus4 [G]suspensions
[D]Advanced techniques [A]need attention
[F#m]To this musical [Bm]dimension

[D]Bridge section [A]changes key
[Bm]Modulating [G]naturally
[D]Back to home where [A]we should be
[F#m]Ending [Bm]harmoniously',
    'Advanced song with modulations and extended chords. Good for technique development.'
  ),
  (
    'City Lights',
    'Urban Collective',
    'Am',
    0,
    130,
    'INTERMEDIATE',
    '[Am]City lights are [F]shining bright
[C]Through the quiet of the [G]night
[Am]Building shadows, [F]tall and grand
[C]Across this busy [G]land

[Am]Strum with feeling, [F]add some soul
[C]Let the music [G]take control
[Am]Urban rhythms, [F]city beat
[C]Make the song [G]complete',
    'Urban folk style. Focus on rhythmic strumming patterns.'
  ),
  (
    'Ocean Breeze',
    'Coastal Sound',
    'E',
    4,
    85,
    'BEGINNER',
    '[E]Ocean breeze, [A]through the trees
[E]Carried on the [B]gentle seas
[E]Simple melody, [A]easy key
[E]Perfect for you and [B]me

[E]Four chords only, [A]nice and slow
[E]Watch your timing as you [B]go
[E]Relax and play, [A]don''t delay
[E]Enjoy this musical [B]day',
    'Very beginner-friendly. Only uses E, A, and B chords.'
  );

-- Create associations between songs and labels
-- Note: Using subqueries to get IDs dynamically

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'Morning Light' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Beginner' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'Morning Light' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Worship' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'River Flow' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Acoustic' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'River Flow' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Folk' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'Mountain Trail' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Acoustic' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'Mountain Trail' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Folk' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'Mountain Trail' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Advanced' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'City Lights' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Rock' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'City Lights' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Urban' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'Ocean Breeze' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Beginner' LIMIT 1);

INSERT IGNORE INTO song_labels (song_id, label_id)
SELECT 
  (SELECT id FROM songs WHERE title = 'Ocean Breeze' LIMIT 1),
  (SELECT id FROM labels WHERE name = 'Acoustic' LIMIT 1);

-- Commit the transaction
COMMIT;

-- Verify seed data
SELECT '=== Labels ===' as '';
SELECT * FROM labels ORDER BY name;

SELECT '=== Songs ===' as '';
SELECT 
  id, 
  title, 
  artist, 
  song_key, 
  difficulty,
  LENGTH(content) as content_length,
  created_at
FROM songs ORDER BY title;

SELECT '=== Song Labels Associations ===' as '';
SELECT 
  s.title as song_title,
  GROUP_CONCAT(l.name ORDER BY l.name SEPARATOR ', ') as labels
FROM songs s
JOIN song_labels sl ON s.id = sl.song_id
JOIN labels l ON sl.label_id = l.id
GROUP BY s.id
ORDER BY s.title;

SELECT '=== Labels with Song Counts ===' as '';
SELECT * FROM labels_with_counts ORDER BY song_count DESC;

SELECT '=== Database Seed Complete ===' as '';
SELECT 
  COUNT(DISTINCT l.id) as total_labels,
  COUNT(DISTINCT s.id) as total_songs,
  COUNT(DISTINCT sl.song_id) as songs_with_labels,
  COUNT(DISTINCT sl.label_id) as labels_in_use
FROM labels l
CROSS JOIN songs s
LEFT JOIN song_labels sl ON s.id = sl.song_id;