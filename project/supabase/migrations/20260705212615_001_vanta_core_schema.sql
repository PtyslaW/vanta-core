/*
# Vanta Core - Club Progress Tracker

1. New Tables
- `club_members` - stores club member data
  - id (uuid, primary key)
  - tag (text, unique) - player tag like #Y2LQRR9J
  - name (text) - player nickname
  - trophies (integer) - current trophy count
  - start_trophies (integer) - trophies at start of tracking period
  - updated_at (timestamp)
  
- `sync_log` - tracks when data was last synced
  - id (uuid, primary key)
  - sync_type (text) - 'automatic' or 'manual'
  - sync_time (timestamp)
  - members_count (integer)

2. Security
- Enable RLS on all tables
- Allow anon + authenticated read (public data)
- Allow anon + authenticated write (for sync functionality)
*/

CREATE TABLE IF NOT EXISTS club_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tag text UNIQUE NOT NULL,
    name text NOT NULL,
    trophies integer NOT NULL DEFAULT 0,
    start_trophies integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_members" ON club_members;
CREATE POLICY "public_read_members" ON club_members FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_members" ON club_members;
CREATE POLICY "public_insert_members" ON club_members FOR INSERT
    TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_members" ON club_members;
CREATE POLICY "public_update_members" ON club_members FOR UPDATE
    TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_members" ON club_members;
CREATE POLICY "public_delete_members" ON club_members FOR DELETE
    TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS sync_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type text NOT NULL,
    members_count integer DEFAULT 0,
    sync_time timestamptz DEFAULT now()
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_sync_log" ON sync_log;
CREATE POLICY "public_read_sync_log" ON sync_log FOR SELECT
    TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_sync_log" ON sync_log;
CREATE POLICY "public_insert_sync_log" ON sync_log FOR INSERT
    TO anon, authenticated WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_club_members_trophies ON club_members(trophies DESC);
