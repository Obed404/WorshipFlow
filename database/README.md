# Chord Viewer Database Setup

This directory contains the database schema and seed data for the Chord Viewer application.

## Files

### Schema Files
- `structure/1_initial.sql` - Main database schema with tables, indexes, and views
- `seed/1_initial.sql` - Initial seed data with sample songs and labels

### Setup Scripts
- `setup.ps1` - PowerShell script for Windows
- `setup.sh` - Bash script for Unix/Linux/macOS

## Database Schema

### Tables

#### `labels`
- `id` - Primary key
- `name` - Unique label name (max 100 chars)
- `color` - Hex color code (default: #3b82f6)
- `instrument` - ENUM: GUITAR, PIANO, UKULELE, BASS, MANDOLIN, OTHER
- `created_at` - Timestamp

#### `songs`
- `id` - Primary key
- `title` - Song title (max 255 chars)
- `artist` - Artist name (optional)
- `song_key` - Original key (e.g., "C", "G", "Am")
- `capo` - Capo position (default: 0)
- `tempo` - Beats per minute
- `difficulty` - ENUM: BEGINNER, INTERMEDIATE, ADVANCED
- `content` - Lyrics with inline chord notation (MEDIUMTEXT)
- `notes` - Additional notes (optional)
- `created_at`, `updated_at` - Timestamps

#### `song_labels`
- `song_id` - Foreign key to songs.id
- `label_id` - Foreign key to labels.id
- Composite primary key (song_id, label_id)
- ON DELETE CASCADE for both foreign keys

### Indexes
- Full-text search on `songs.content`
- Indexes on frequently searched fields (title, artist, difficulty)
- Foreign key indexes for performance

### Views
- `labels_with_counts` - Labels with song counts
- `songs_with_labels` - Songs with concatenated label names and IDs

## Seed Data

### Sample Labels (5)
1. Piano Worship (#3b82f6, PIANO)
2. Rock (#ef4444, GUITAR)
3. Acoustic (#10b981, GUITAR)
4. Beginner (#f59e0b, OTHER)
5. Ukulele (#8b5cf6, UKULELE)

### Sample Songs (5)
All songs use original chord progressions to avoid copyright issues:

1. **Morning Light** (C, Beginner) - Simple practice song
2. **River Flow** (G, Intermediate) - Fingerstyle piece
3. **Mountain Trail** (D, Advanced) - Complex chords and modulations
4. **City Lights** (Am, Intermediate) - Urban folk style
5. **Ocean Breeze** (E, Beginner) - Very beginner-friendly

## Setup Instructions

### Prerequisites
- MySQL 8+ running on `127.0.0.1:3307`
- MySQL client tools installed (`mysql` command available)
- User `root` with password `root` (or update credentials)

### Using PowerShell (Windows)
```powershell
cd database
.\setup.ps1
```

Custom parameters:
```powershell
.\setup.ps1 -Host "localhost" -Port 3306 -User "myuser" -Password "mypass"
```

### Using Bash (Unix/Linux/macOS)
```bash
cd database
chmod +x setup.sh
./setup.sh
```

Custom parameters:
```bash
./setup.sh --host localhost --port 3306 --user myuser --password mypass
```

### Manual Setup
1. Create database:
```sql
CREATE DATABASE chord_viewer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Apply schema:
```bash
mysql -u root -p -h 127.0.0.1 -P 3307 chord_viewer < structure/1_initial.sql
```

3. Seed data:
```bash
mysql -u root -p -h 127.0.0.1 -P 3307 chord_viewer < seed/1_initial.sql
```

## Verification

After setup, you can verify by:

1. Checking tables exist:
```sql
SHOW TABLES;
```

2. Viewing labels:
```sql
SELECT * FROM labels ORDER BY name;
```

3. Viewing songs:
```sql
SELECT title, artist, song_key, difficulty FROM songs ORDER BY title;
```

4. Checking associations:
```sql
SELECT s.title, GROUP_CONCAT(l.name) as labels
FROM songs s
JOIN song_labels sl ON s.id = sl.song_id
JOIN labels l ON sl.label_id = l.id
GROUP BY s.id;
```

## Environment Configuration

Update `backend/.env` with your database credentials:
```
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=chord_viewer
DB_USER=root
DB_PASSWORD=root
```

## Troubleshooting

### Connection Issues
- Ensure MySQL service is running
- Check firewall settings for port 3307
- Verify username/password

### Permission Issues
- User needs CREATE, INSERT, SELECT, UPDATE, DELETE permissions
- Check MySQL user privileges

### SQL Errors
- Check MySQL version (requires 8+ for full functionality)
- Verify SQL syntax in the .sql files

### Port Conflicts
If port 3307 is occupied, either:
1. Change MySQL to use a different port
2. Update all configuration files with new port

## Database Features

### Full-Text Search
The `songs` table has a full-text index on the `content` column for searching chord notations and lyrics.

### Cascade Deletes
When a song or label is deleted, all associated records in `song_labels` are automatically deleted.

### UTF-8 Support
All tables use `utf8mb4` character set for full Unicode support including emojis.

### Performance
- Proper indexing for common queries
- Foreign key indexes for join performance
- Views for common complex queries