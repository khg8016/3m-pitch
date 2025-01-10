export interface Profile {
  username: string;
  follower_count: number;
  following_count: number;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  views: number;
  likes: number;
  comment_count: number;
  saved_count: number;
  created_at: string;
  user_id: string;
  profiles: Profile;
  is_liked?: boolean;
  is_following?: boolean;
  is_saved?: boolean;
}

export interface DatabaseVideo extends Omit<Video, "profiles"> {
  profiles: {
    username: string;
    follower_count: number;
    following_count: number;
  };
}

export interface Like {
  id: string;
}

export interface Follow {
  id: string;
}

export interface Save {
  id: string;
}
