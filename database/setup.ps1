# Chord Viewer Database Setup Script for Windows PowerShell
# This script helps set up the MySQL database for the Chord Viewer application

param(
    [string]$MySQLPath = "mysql",
    [string]$Host = "127.0.0.1",
    [int]$Port = 3307,
    [string]$User = "root",
    [string]$Password = "root",
    [string]$Database = "chord_viewer"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Chord Viewer Database Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL client is available
try {
    $mysqlVersion = & $MySQLPath --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL client not found or not working"
    }
    Write-Host "✓ MySQL client found: $($mysqlVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "✗ MySQL client not found or not accessible" -ForegroundColor Red
    Write-Host "Please ensure MySQL client is installed and in your PATH" -ForegroundColor Yellow
    Write-Host "Or update the -MySQLPath parameter to point to your mysql.exe" -ForegroundColor Yellow
    exit 1
}

# Test database connection
Write-Host "`nTesting database connection..." -ForegroundColor Cyan
$connectionTest = & $MySQLPath -h $Host -P $Port -u $User -p$Password -e "SELECT 'Connection successful' as status;" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Cannot connect to MySQL database" -ForegroundColor Red
    Write-Host "  Host: $Host" -ForegroundColor Yellow
    Write-Host "  Port: $Port" -ForegroundColor Yellow
    Write-Host "  User: $User" -ForegroundColor Yellow
    Write-Host "`nPossible solutions:" -ForegroundColor Yellow
    Write-Host "1. Make sure MySQL is running on $Host:$Port" -ForegroundColor Yellow
    Write-Host "2. Check your username and password" -ForegroundColor Yellow
    Write-Host "3. Verify MySQL service is started" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Database connection successful" -ForegroundColor Green

# Create database
Write-Host "`nCreating database '$Database'..." -ForegroundColor Cyan
& $MySQLPath -h $Host -P $Port -u $User -p$Password -e "CREATE DATABASE IF NOT EXISTS $Database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to create database" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Database created" -ForegroundColor Green

# Apply schema
Write-Host "`nApplying database schema..." -ForegroundColor Cyan
& $MySQLPath -h $Host -P $Port -u $User -p$Password $Database < ".\structure\1_initial.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to apply schema" -ForegroundColor Red
    Write-Host "Check structure\1_initial.sql for SQL errors" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Schema applied successfully" -ForegroundColor Green

# Seed data
Write-Host "`nSeeding initial data..." -ForegroundColor Cyan
& $MySQLPath -h $Host -P $Port -u $User -p$Password $Database < ".\seed\1_initial.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to seed data" -ForegroundColor Red
    Write-Host "Check seed\1_initial.sql for SQL errors" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Data seeded successfully" -ForegroundColor Green

# Verify setup
Write-Host "`nVerifying database setup..." -ForegroundColor Cyan
$verification = & $MySQLPath -h $Host -P $Port -u $User -p$Password $Database -e "
    SELECT 'Tables:' as '';
    SHOW TABLES;
    
    SELECT 'Labels:' as '';
    SELECT name, color, instrument FROM labels ORDER BY name;
    
    SELECT 'Songs:' as '';
    SELECT title, artist, song_key, difficulty FROM songs ORDER BY title;
    
    SELECT 'Setup Complete:' as '';
    SELECT 
        (SELECT COUNT(*) FROM labels) as 'Total Labels',
        (SELECT COUNT(*) FROM songs) as 'Total Songs',
        (SELECT COUNT(DISTINCT song_id) FROM song_labels) as 'Songs with Labels';
" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Verification failed" -ForegroundColor Red
} else {
    Write-Host $verification -ForegroundColor White
    Write-Host "`n✅ Database setup complete!" -ForegroundColor Green
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "Database Connection Details:" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Host: $Host" -ForegroundColor White
Write-Host "Port: $Port" -ForegroundColor White
Write-Host "Database: $Database" -ForegroundColor White
Write-Host "User: $User" -ForegroundColor White
Write-Host "`nUpdate your backend/.env file with these credentials" -ForegroundColor Yellow