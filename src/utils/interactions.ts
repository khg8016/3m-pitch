import { supabase } from "../lib/supabase";

export async function toggleLike(
  videoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('toggle_like', {
      video_id: videoId,
      user_id: userId
    });

    if (error) throw error;
    return { success: true };
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
    const { error } = await supabase.rpc('toggle_follow', {
      following_id: followingId,
      follower_id: followerId
    });

    if (error) throw error;
    return { success: true };
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
    const { error } = await supabase.rpc('toggle_save', {
      video_id: videoId,
      user_id: userId
    });

    if (error) throw error;
    return { success: true };
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
