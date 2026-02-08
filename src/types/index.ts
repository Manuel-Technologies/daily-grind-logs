export interface Profile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Log {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  hidden_at?: string | null;
  deleted_at?: string | null;
  comments_locked?: boolean;
  profiles?: Profile;
  likes_count?: number;
  comments_count?: number;
  relogs_count?: number;
  views_count?: number;
  user_has_liked?: boolean;
  user_has_relogged?: boolean;
  is_relog?: boolean;
  original_author?: Profile;
  relogged_by?: Profile;
}

export interface Like {
  id: string;
  user_id: string;
  log_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  log_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Relog {
  id: string;
  user_id: string;
  log_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'relog' | 'follow' | 'mention';
  log_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Mention {
  id: string;
  log_id: string;
  user_id: string;
  created_at: string;
}
