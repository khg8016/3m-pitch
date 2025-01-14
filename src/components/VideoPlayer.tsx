import React, { useRef, useEffect, useState } from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Play,
  Volume2,
  VolumeX,
  Music2,
  X,
  Copy,
  Check,
  Facebook,
  Twitter,
  Instagram,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Comments } from "./Comments";
import { Video } from "../types/video";
import { formatNumber, formatHashtags, formatDuration } from "../utils/format";
import { toggleLike, toggleFollow, toggleSave, shareVideo } from "../utils/interactions";

export function VideoPlayer({
  video: initialVideo,
  isActive,
}: {
  video: Video;
  isActive: boolean;
}): JSX.Element {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  type VideoAction = 
    | { type: 'SET_VIDEO'; payload: Video }
    | { type: 'TOGGLE_LIKE' }
    | { type: 'TOGGLE_SAVE' }
    | { type: 'TOGGLE_FOLLOW' }
    | { type: 'UPDATE_COMMENT_COUNT'; payload: number };

  const videoReducer = (state: Video, action: VideoAction): Video => {
    switch (action.type) {
      case 'SET_VIDEO':
        return action.payload;
      case 'TOGGLE_LIKE':
        return {
          ...state,
          is_liked: !state.is_liked,
          likes: Math.max(0, state.likes + (state.is_liked ? -1 : 1))
        };
      case 'TOGGLE_SAVE':
        return {
          ...state,
          is_saved: !state.is_saved,
          saved_count: Math.max(0, state.saved_count + (state.is_saved ? -1 : 1))
        };
      case 'TOGGLE_FOLLOW':
        return {
          ...state,
          is_following: !state.is_following,
          profiles: {
            ...state.profiles,
            follower_count: Math.max(0, state.profiles.follower_count + (state.is_following ? -1 : 1))
          }
        };
      case 'UPDATE_COMMENT_COUNT':
        return {
          ...state,
          comment_count: action.payload
        };
      default:
        return state;
    }
  };

  const [video, dispatch] = React.useReducer(videoReducer, initialVideo);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Update video state when initialVideo changes
  useEffect(() => {
    dispatch({ type: 'SET_VIDEO', payload: initialVideo });
  }, [initialVideo]);

  // Handle video playback based on active state
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      if (!isActive) {
        video.pause();
        video.currentTime = 0;
        setIsPlaying(false);
      }

      const handleTimeUpdate = () => {
        const progress = (video.currentTime / video.duration) * 100;
        setProgress(progress);
        setCurrentTime(formatDuration(video.currentTime));
      };

      const handleLoadedMetadata = () => {
        setDuration(formatDuration(video.duration));
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          video.pause();
          setIsPlaying(false);
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        video.pause();
        video.currentTime = 0;
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
  }, [isActive]);

  // Subscribe to comment count updates only
  useEffect(() => {
    const channel = supabase
      .channel('video_comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `video_id=eq.${video.id}`,
        },
        () => {
          // Get updated comment count
          supabase
            .from('videos')
            .select('comment_count')
            .eq('id', video.id)
            .single()
            .then(({ data }) => {
              if (data) {
                dispatch({ 
                  type: 'UPDATE_COMMENT_COUNT', 
                  payload: data.comment_count 
                });
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [video.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    // Optimistic update
    dispatch({ type: 'TOGGLE_LIKE' });

    const result = await toggleLike(video.id, user.id);
    if (!result.success) {
      // Rollback on failure
      dispatch({ type: 'TOGGLE_LIKE' });
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    console.log('VideoPlayer - Follow button clicked:', {
      video_id: video.id,
      user_id: video.user_id,
      current_state: {
        is_following: video.is_following,
        follower_count: video.profiles.follower_count
      }
    });

    // Optimistic update
    dispatch({ type: 'TOGGLE_FOLLOW' });

    console.log('VideoPlayer - After optimistic update:', {
      video_id: video.id,
      user_id: video.user_id,
      updated_state: {
        is_following: !video.is_following,
        follower_count: video.profiles.follower_count + (video.is_following ? -1 : 1)
      }
    });

    const result = await toggleFollow(video.user_id, user.id);
    console.log('VideoPlayer - Toggle follow result:', result);

    if (!result.success) {
      console.log('VideoPlayer - Rolling back optimistic update');
      dispatch({ type: 'TOGGLE_FOLLOW' });
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    // Optimistic update
    dispatch({ type: 'TOGGLE_SAVE' });

    const result = await toggleSave(video.id, user.id);
    if (!result.success) {
      // Rollback on failure
      dispatch({ type: 'TOGGLE_SAVE' });
    }
  };

  const handleShare = (platform: "facebook" | "twitter" | "instagram") => {
    shareVideo(video.id, platform);
  };

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="snap-slide relative bg-black min-h-screen flex items-center justify-center">
      <div className="flex gap-8">
        {/* Video Container */}
        <div className="relative w-[500px] aspect-[9/16] bg-black/95 rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-black">
          {/* Title section */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <h1 className="text-white text-xl font-bold">{video.title}</h1>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            src={video.video_url}
            className="w-full h-full object-cover"
            playsInline
            loop
            muted={isMuted}
            onClick={togglePlayPause}
          />

          {/* Play button overlay */}
          {!isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlayPause}
            >
              <div className="bg-black/30 rounded-full p-4">
                <Play className="w-16 h-16 text-white" />
              </div>
            </div>
          )}

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="absolute bottom-4 right-4 z-10 tiktok-icon-button"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-white" />
            ) : (
              <Volume2 className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Bottom overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            {/* Info section */}
            <div className="mb-8">
              <div className="flex items-center mb-2">
                <span className="text-white font-bold">
                  @{video.profiles.username}
                </span>
                <span className="ml-2 text-sm text-white/80">
                  {new Date(video.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-white text-sm mb-2">
                {formatHashtags(video.description)}
              </p>
              <div className="flex items-center">
                <Music2 className="w-4 h-4 text-white mr-2" />
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-100 rounded-full overflow-hidden mr-2 music-disc">
                    <img
                      src={`https://api.dicebear.com/7.x/shapes/svg?seed=${video.id}`}
                      alt="Music"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white text-sm">
                    Original Sound - {video.profiles.username}
                  </span>
                </div>
              </div>
            </div>

            {/* Video progress bar */}
            <div>
              <div
                className="relative w-full h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = (x / rect.width) * 100;
                  if (videoRef.current) {
                    const newTime =
                      (percentage / 100) * videoRef.current.duration;
                    videoRef.current.currentTime = newTime;
                  }
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 bg-white rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-white/80">{currentTime}</span>
                <span className="text-xs text-white/80">{duration}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Panel */}
        {showComments && (
          <div className="w-[400px] h-[890px] bg-white dark:bg-black/95 rounded-[3rem] overflow-hidden shadow-2xl border-[8px] border-gray-100 dark:border-black">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comments
              </h2>
              <button
                onClick={() => setShowComments(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="h-[830px] overflow-y-auto">
              <Comments videoId={video.id} />
            </div>
          </div>
        )}

        {/* Right side buttons */}
        <div className="flex flex-col items-center justify-center space-y-8 pt-[72px]">
          {/* Profile */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full overflow-hidden">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${video.profiles.username}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            {user?.id !== video.user_id && (
              <button
                className={`follow-button mt-2 px-3 py-1.5 rounded-full text-sm ${
                  video.is_following
                    ? "border border-white/50 text-white"
                    : "bg-red-500 text-white"
                }`}
                onClick={handleFollow}
              >
                {video.is_following ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* Like */}
          <div className="flex flex-col items-center">
            <button
              className="like-button w-14 h-14 flex items-center justify-center"
              onClick={handleLike}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  video.is_liked ? "bg-red-500/20" : "bg-black/20"
                }`}
              >
                <Heart
                  className={`w-8 h-8 ${
                    video.is_liked ? "fill-red-500 text-red-500" : "text-white"
                  }`}
                />
              </div>
            </button>
            <span className="text-white text-sm mt-1">
              {formatNumber(video.likes)}
            </span>
          </div>

          {/* Comments */}
          <div className="flex flex-col items-center">
            <button
              className="w-14 h-14 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(!showComments);
              }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-black/20">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
            </button>
            <span className="text-white text-sm mt-1">
              {formatNumber(video.comment_count || 0)}
            </span>
          </div>

          {/* Save */}
          <div className="flex flex-col items-center">
            <button
              className="w-14 h-14 flex items-center justify-center"
              onClick={handleSave}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  video.is_saved ? "bg-blue-500/20" : "bg-black/20"
                }`}
              >
                <Bookmark
                  className={`w-8 h-8 ${
                    video.is_saved ? "fill-blue-500 text-blue-500" : "text-white"
                  }`}
                />
              </div>
            </button>
            <span className="text-white text-sm mt-1">
              {formatNumber(video.saved_count)}
            </span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center relative">
            <button
              className="w-14 h-14 flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                setShowShareMenu(!showShareMenu);
              }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-black/20">
                <Share2 className="w-8 h-8 text-white" />
              </div>
            </button>
            <span className="text-white text-sm mt-1">Share</span>

            {/* Share Menu */}
            {showShareMenu && (
              <div
                className="absolute right-16 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 w-64 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-gray-900 dark:text-white font-semibold mb-3">
                  Share to
                </h3>

                {/* Copy Link */}
                <button
                  className="flex items-center gap-3 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  onClick={async () => {
                    const baseUrl = window.location.origin;
                    const shareUrl = `${baseUrl}/video/${video.id}`;
                    await navigator.clipboard.writeText(shareUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                >
                  {copiedLink ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  )}
                  <span className="text-gray-700 dark:text-gray-200">
                    {copiedLink ? "Copied!" : "Copy link"}
                  </span>
                </button>

                {/* Social Media Buttons */}
                <div className="mt-2 space-y-2">
                  <button
                    className="flex items-center gap-3 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => handleShare("facebook")}
                  >
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700 dark:text-gray-200">
                      Share on Facebook
                    </span>
                  </button>

                  <button
                    className="flex items-center gap-3 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => handleShare("twitter")}
                  >
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <span className="text-gray-700 dark:text-gray-200">
                      Share on Twitter
                    </span>
                  </button>

                  <button
                    className="flex items-center gap-3 w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    onClick={() => handleShare("instagram")}
                  >
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <span className="text-gray-700 dark:text-gray-200">
                      Share on Instagram
                    </span>
                  </button>
                </div>

                {/* Close button */}
                <button
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => setShowShareMenu(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
