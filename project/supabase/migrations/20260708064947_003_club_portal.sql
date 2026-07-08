/*
# Club Portal - Announcements and Contests

1. New Tables
- `announcements`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `content` (text, not null)
  - `author` (text, not null)
  - `pinned` (boolean, default false - wazne ogloszenia na gorze)
  - `created_at` (timestamptz)

- `contests`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `description` (text, not null)
  - `reward` (text, not null - np "100 gemow")
  - `start_date` (date)
  - `end_date` (date, nullable - moze byc bezterminowy)
  - `status` (text, default 'active' - active/completed/cancelled)
  - `rules` (text, nullable)
  - `created_at` (timestamptz)

- `contest_participants`
  - `id` (uuid, primary key)
  - `contest_id` (uuid, references contests)
  - `player_tag` (text)
  - `player_name` (text)
  - `score` (integer, default 0)
  - `created_at` (timestamptz)

2. Security
- Single-tenant app: anon + authenticated full access
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  author text NOT NULL DEFAULT 'Lider',
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  reward text NOT NULL,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  rules text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contest_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
  player_tag text NOT NULL,
  player_name text NOT NULL,
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contest_id, player_tag)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);
CREATE INDEX IF NOT EXISTS idx_contest_participants_contest ON contest_participants(contest_id, score DESC);

-- RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contest_participants ENABLE ROW LEVEL SECURITY;

-- Policies for announcements
DROP POLICY IF EXISTS "anon_crud_announcements" ON announcements;
CREATE POLICY "anon_crud_announcements" ON announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_announcements" ON announcements FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_announcements" ON announcements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_announcements" ON announcements FOR DELETE TO anon, authenticated USING (true);

-- Policies for contests
DROP POLICY IF EXISTS "anon_crud_contests" ON contests;
CREATE POLICY "anon_crud_contests" ON contests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_contests" ON contests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_contests" ON contests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_contests" ON contests FOR DELETE TO anon, authenticated USING (true);

-- Policies for participants
DROP POLICY IF EXISTS "anon_crud_participants" ON contest_participants;
CREATE POLICY "anon_crud_participants" ON contest_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_participants" ON contest_participants FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_participants" ON contest_participants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_participants" ON contest_participants FOR DELETE TO anon, authenticated USING (true);