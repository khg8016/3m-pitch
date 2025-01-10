import { supabase } from "../lib/supabase";

export async function toggleLike(
  videoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      // Unlike
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("video_id", videoId)
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    } else {
      // Like
      const { error } = await supabase.from("likes").insert([
        {
          video_id: videoId,
          user_id: userId,
        },
      ]);

      if (error) throw error;
      return { success: true };
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    return { success: false, error: "Failed to toggle like" };
  }
}

export async function toggleFollow(
  followingId: string,
  followerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("following_id", followingId)
      .eq("follower_id", followerId)
      .maybeSingle();

    if (data) {
      // Unfollow
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("following_id", followingId)
        .eq("follower_id", followerId);

      if (error) throw error;
      return { success: true };
    } else {
      // Follow
      const { error } = await supabase.from("follows").insert([
        {
          following_id: followingId,
          follower_id: followerId,
        },
      ]);

      if (error) throw error;
      return { success: true };
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    return { success: false, error: "Failed to toggle follow" };
  }
}

export async function toggleSave(
  videoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data } = await supabase
      .from("saves")
      .select("id")
      .eq("video_id", videoId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      // Unsave
      const { error } = await supabase
        .from("saves")
        .delete()
        .eq("video_id", videoId)
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    } else {
      // Save
      const { error } = await supabase.from("saves").insert([
        {
          video_id: videoId,
          user_id: userId,
        },
      ]);

      if (error) throw error;
      return { success: true };
    }
  } catch (error) {
    console.error("Error toggling save:", error);
    return { success: false, error: "Failed to toggle save" };
  }
}

export function shareVideo(
  videoId: string,
  platform: "facebook" | "twitter" | "instagram"
): void {
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/video/${videoId}`;

  const urls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
    instagram: `https://www.instagram.com/share?url=${encodeURIComponent(shareUrl)}`,
  };

  window.open(urls[platform], '_blank', 'width=600,height=400');
}
