export interface Member {
  id: string;
  tag: string;
  name: string;
  trophies: number;
  start_trophies: number;
  updated_at: string;
  progress?: number;
}

export interface SyncLog {
  sync_time: string;
  members_count: number;
  sync_type: string;
}

export interface WeeklySnapshot {
  id: string;
  member_tag: string;
  member_name: string;
  week_start: string;
  start_trophies: number;
  end_trophies: number;
  progress: number;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  pinned: boolean;
  created_at: string;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  reward: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'completed' | 'cancelled';
  rules: string | null;
  created_at: string;
}

export interface ContestParticipant {
  id: string;
  contest_id: string;
  player_tag: string;
  player_name: string;
  score: number;
  created_at: string;
}
