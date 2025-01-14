import { supabase } from "../lib/supabase";

export async function toggleLike(
  videoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if like exists
    const { data: likes } = await supabase
      .from('likes')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', userId);

    const likeExists = likes && likes.length > 0;

    if (likeExists) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([{ video_id: videoId, user_id: userId }]);

      if (error) throw error;
    }

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
  console.log('toggleFollow - Starting:', { followingId, followerId });
  
  try {
    // Prevent self-following
    if (followingId === followerId) {
      console.log('toggleFollow - Self follow prevented');
      return { success: false, error: "Cannot follow yourself" };
    }

    // Check if follow exists
    console.log('toggleFollow - Checking if follow exists');
    const { data: follows, error: checkError } = await supabase
      .from('follows')
      .select('id')
      .eq('following_id', followingId)
      .eq('follower_id', followerId);

    if (checkError) {
      console.error('toggleFollow - Error checking follow:', checkError);
      throw checkError;
    }

    const followExists = follows && follows.length > 0;
    console.log('toggleFollow - Follow exists:', followExists);

    if (followExists) {
      console.log('toggleFollow - Deleting follow');
      const { error: deleteError } = await supabase
        .from('follows')
        .delete()
        .eq('following_id', followingId)
        .eq('follower_id', followerId);

      if (deleteError) {
        console.error('toggleFollow - Delete error:', deleteError);
        throw deleteError;
      }
      console.log('toggleFollow - Delete successful');
    } else {
      console.log('toggleFollow - Inserting follow');
      const { error: insertError } = await supabase
        .from('follows')
        .insert([{ following_id: followingId, follower_id: followerId }]);

      if (insertError) {
        console.error('toggleFollow - Insert error:', insertError);
        throw insertError;
      }
      console.log('toggleFollow - Insert successful');
    }

    console.log('toggleFollow - Operation completed successfully');
    return { success: true };
  } catch (error) {
    console.error('toggleFollow - Operation failed:', error);
    return { success: false, error: "Failed to toggle follow" };
  }
}

export async function toggleSave(
  videoId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if save exists
    const { data: saves } = await supabase
      .from('saves')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', userId);

    const saveExists = saves && saves.length > 0;

    if (saveExists) {
      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('saves')
        .insert([{ video_id: videoId, user_id: userId }]);

      if (error) throw error;
    }

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
