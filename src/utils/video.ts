import { supabase } from "../lib/supabase";
import { DatabaseVideo, Video, Like, Follow, Save } from "../types/video";
import { fetchSingle } from "./supabase";

export function getVideoUrl(videoPath: string): string {
  return supabase.storage.from("videos").getPublicUrl(videoPath).data.publicUrl;
}

export async function checkVideoInteractions(
  videoId: string,
  userId: string,
  videoUserId: string
): Promise<{
  isLiked: boolean;
  isFollowing: boolean;
  isSaved: boolean;
}> {
  const [likeResponse, followResponse, saveResponse] = await Promise.all([
    fetchSingle<Like>(
      supabase
        .from("likes")
        .select("id")
        .eq("video_id", videoId)
        .eq("user_id", userId)
        .maybeSingle()
    ),
    fetchSingle<Follow>(
      supabase
        .from("follows")
        .select("id")
        .eq("following_id", videoUserId)
        .eq("follower_id", userId)
        .maybeSingle()
    ),
    fetchSingle<Save>(
      supabase
        .from("saves")
        .select("id")
        .eq("video_id", videoId)
        .eq("user_id", userId)
        .maybeSingle()
    ),
  ]);

  return {
    isLiked: !!likeResponse.data,
    isFollowing: !!followResponse.data,
    isSaved: !!saveResponse.data,
  };
}

export function transformDatabaseVideo(dbVideo: DatabaseVideo): Video {
  return {
    ...dbVideo,
    profiles: dbVideo.profiles,
  };
}

export async function updateVideoStats(videoId: string): Promise<Video | null> {
  const response = await fetchSingle<DatabaseVideo>(
    supabase
      .from("videos")
      .select(
        `
        id,
        title,
        description,
        video_url,
        views,
        likes,
        comment_count,
        saved_count,
        created_at,
        user_id,
        profiles (
          username,
          follower_count,
          following_count
        )
      `
      )
      .eq("id", videoId)
      .maybeSingle()
  );

  if (!response.error && response.data) {
    return transformDatabaseVideo(response.data);
  }

  return null;
}

export function getVideoQuery(columns = "*") {
  return supabase.from("videos").select(`
    id,
    title,
    description,
    video_url,
    views,
    likes,
    comment_count,
    saved_count,
    created_at,
    user_id,
    profiles (
      username,
      follower_count,
      following_count
    )
    ${columns ? `, ${columns}` : ""}
  `);
}
