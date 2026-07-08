/*
# Weekly Snapshots - Track member progress history

1. New Tables
- `weekly_snapshots`
  - `id` (uuid, primary key)
  - `member_tag` (text, references club_members.tag)
  - `member_name` (text, denormalized for historical accuracy)
  - `week_start` (date, start of the week - Monday)
  - `start_trophies` (integer, trophies at beginning of week)
  - `end_trophies` (integer, trophies at end of week, nullable during week)
  - `progress` (integer, calculated difference)
  - `created_at` (timestamptz)
  - Unique constraint on (member_tag, week_start) to prevent duplicates

2. Purpose
- Store weekly progress snapshots for each member
- Allows comparison across weeks
- Tracks who pushes consistently vs who slacks

3. Security
- Enable RLS on `weekly_snapshots`
- Single-tenant app: allow anon + authenticated full access
*/

CREATE TABLE IF NOT EXISTS weekly_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_tag text NOT NULL,
  member_name text NOT NULL,
  week_start date NOT NULL,
  start_trophies integer NOT NULL,
  end_trophies integer,
  progress integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_tag, week_start)
);

-- Index for faster queries by week
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_week_start ON weekly_snapshots(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_member_tag ON weekly_snapshots(member_tag);

ALTER TABLE weekly_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_snapshots" ON weekly_snapshots;
CREATE POLICY "anon_select_snapshots" ON weekly_snapshots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_snapshots" ON weekly_snapshots;
CREATE POLICY "anon_insert_snapshots" ON weekly_snapshots FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_snapshots" ON weekly_snapshots;
CREATE POLICY "anon_update_snapshots" ON weekly_snapshots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_snapshots" ON weekly_snapshots;
CREATE POLICY "anon_delete_snapshots" ON weekly_snapshots FOR DELETE
  TO anon, authenticated USING (true);

-- Function to get current week's Monday
CREATE OR REPLACE FUNCTION get_week_start(date_val date DEFAULT CURRENT_DATE)
RETURNS date AS $$
BEGIN
  RETURN date_val - ((EXTRACT(DOW FROM date_val) + 6) % 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;