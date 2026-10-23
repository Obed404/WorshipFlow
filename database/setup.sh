#!/bin/bash

# Chord Viewer Database Setup Script for Unix/Linux/macOS
# This script helps set up the MySQL database for the Chord Viewer application

set -e

# Default configuration
MYSQL_PATH="mysql"
HOST="127.0.0.1"
PORT="3307"
USER="root"
PASSWORD="root"
DATABASE="chord_viewer"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --mysql-path)
      MYSQL_PATH="$2"
      shift 2
      ;;
    --host)
      HOST="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    --user)
      USER="$2"
      shift 2
      ;;
    --password)
      PASSWORD="$2"
      shift 2
      ;;
    --database)
      DATABASE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --mysql-path PATH    Path to mysql client (default: mysql)"
      echo "  --host HOST          MySQL host (default: 127.0.0.1)"
      echo "  --port PORT          MySQL port (default: 3307)"
      echo "  --user USER          MySQL user (default: root)"
      echo "  --password PASSWORD  MySQL password (default: root)"
      echo "  --database DATABASE  Database name (default: chord_viewer)"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "========================================="
echo "Chord Viewer Database Setup"
echo "========================================="
echo ""

# Check if MySQL client is available
if ! command -v "$MYSQL_PATH" &> /dev/null; then
  echo "✗ MySQL client not found or not accessible"
  echo "Please ensure MySQL client is installed and in your PATH"
  echo "Or update the --mysql-path parameter to point to your mysql binary"
  exit 1
fi

MYSQL_VERSION=$("$MYSQL_PATH" --version 2>/dev/null || echo "unknown")
echo "✓ MySQL client found: $MYSQL_VERSION"

# Test database connection
echo -e "\nTesting database connection..."
if ! "$MYSQL_PATH" -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" -e "SELECT 'Connection successful' as status;" &>/dev/null; then
  echo "✗ Cannot connect to MySQL database"
  echo "  Host: $HOST"
  echo "  Port: $PORT"
  echo "  User: $USER"
  echo -e "\nPossible solutions:"
  echo "1. Make sure MySQL is running on $HOST:$PORT"
  echo "2. Check your username and password"
  echo "3. Verify MySQL service is started"
  exit 1
fi

echo "✓ Database connection successful"

# Create database
echo -e "\nCreating database '$DATABASE'..."
"$MYSQL_PATH" -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if [ $? -ne 0 ]; then
  echo "✗ Failed to create database"
  exit 1
fi

echo "✓ Database created"

# Apply schema
echo -e "\nApplying database schema..."
"$MYSQL_PATH" -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" < "./structure/1_initial.sql"

if [ $? -ne 0 ]; then
  echo "✗ Failed to apply schema"
  echo "Check structure/1_initial.sql for SQL errors"
  exit 1
fi

echo "✓ Schema applied successfully"

# Seed data
echo -e "\nSeeding initial data..."
"$MYSQL_PATH" -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" < "./seed/1_initial.sql"

if [ $? -ne 0 ]; then
  echo "✗ Failed to seed data"
  echo "Check seed/1_initial.sql for SQL errors"
  exit 1
fi

echo "✓ Data seeded successfully"

# Verify setup
echo -e "\nVerifying database setup..."
"$MYSQL_PATH" -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" -e "
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
"

if [ $? -ne 0 ]; then
  echo "✗ Verification failed"
  exit 1
fi

echo -e "\n✅ Database setup complete!"
echo -e "\n========================================="
echo "Database Connection Details:"
echo "========================================="
echo "Host: $HOST"
echo "Port: $PORT"
echo "Database: $DATABASE"
echo "User: $USER"
echo -e "\nUpdate your backend/.env file with these credentials"