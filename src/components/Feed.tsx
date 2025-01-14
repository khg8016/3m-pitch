import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { VideoNavigation } from "./VideoNavigation";
import { useAuth } from "../context/AuthContext";
import { VideoPlayer } from "./VideoPlayer";
import { Video, DatabaseVideo } from "../types/video";

export function Feed(): JSX.Element {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user } = useAuth();
  const { videoId } = useParams<{ videoId?: string }>();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const followMapRef = useRef<Set<string>>(new Set());

  // Memoize video IDs and user IDs to prevent unnecessary re-subscriptions
  const videoIds = useMemo(() => videos.map(v => v.id), [videos]);
  const userIds = useMemo(() => videos.map(v => v.user_id), [videos]);

  // Subscribe to video updates
  useEffect(() => {
    if (!videoIds.length || !user) return;

    // Clean up previous subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`feed_updates_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'videos',
          filter: `id=in.(${videoIds.join(',')})`,
        },
        (payload: any) => {
          if (payload.new) {
            setVideos(prev => prev.map(video =>
              video.id === payload.new.id
                ? {
                    ...video,
                    comment_count: payload.new.comment_count ?? video.comment_count,
                  }
                : video
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=in.(${userIds.join(',')})`,
        },
        (payload: any) => {
          if (payload.new) {
            setVideos(prev => prev.map(video =>
              video.user_id === payload.new.id
                ? {
                    ...video,
                    profiles: {
                      ...video.profiles,
                      follower_count: payload.new.follower_count ?? video.profiles.follower_count,
                    }
                  }
                : video
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${user.id} or following_id=in.(${userIds.join(',')})`,
        },
        (payload: any) => {
          console.log('Feed - Follows change payload:', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            currentVideos: videos.map(v => ({
              id: v.id,
              user_id: v.user_id,
              is_following: v.is_following
            }))
          });
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            console.log('Feed - Processing follow change');
            
            // Check if current user is the follower
            if (payload.new?.follower_id === user.id || payload.old?.follower_id === user.id) {
              const followingId = payload.eventType === 'INSERT' 
                ? payload.new.following_id 
                : payload.old.following_id;
              const isFollowing = payload.eventType === 'INSERT';
              
              console.log('Feed - Current user follow status change:', {
                followingId,
                isFollowing,
                affectedVideos: videos.filter(v => v.user_id === followingId).length
              });

              // Update followMapRef
              if (isFollowing) {
                followMapRef.current.add(followingId);
              } else {
                followMapRef.current.delete(followingId);
              }
              
              // Update is_following status for all videos from the same user
              setVideos(prev => prev.map(video => 
                video.user_id === followingId
                  ? { ...video, is_following: isFollowing }
                  : video
              ));
            }
            
            // Check if any video creator is being followed/unfollowed
            const affectedUserId = payload.eventType === 'INSERT' 
              ? payload.new.following_id 
              : payload.old.following_id;
            
            if (videos.some(v => v.user_id === affectedUserId)) {
              console.log('Feed - Video creator follower count change:', {
                userId: affectedUserId,
                delta: payload.eventType === 'INSERT' ? 1 : -1
              });
              
              // Update follower count for affected videos
              setVideos(prev => prev.map(video =>
                video.user_id === affectedUserId
                  ? {
                      ...video,
                      profiles: {
                        ...video.profiles,
                        follower_count: Math.max(0, video.profiles.follower_count + (payload.eventType === 'INSERT' ? 1 : -1))
                      }
                    }
                  : video
              ));
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [videoIds, userIds.join(','), user?.id]);

  // Load videos
  useEffect(() => {
    const loadVideos = async (): Promise<void> => {
      try {
        let query = supabase
          .from("videos")
          .select(`
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
            profiles!inner (
              username,
              follower_count,
              following_count
            )
          `)
          .order("created_at", { ascending: false });

        if (videoId) {
          query = query.eq("id", videoId);
        }

        const { data: videos, error: videosError } = await query as any;

        if (videosError) throw videosError;
        if (!videos || videos.length === 0) return;

        // Get user interactions if logged in
        let likeMap = new Set<string>();
        let saveMap = new Set<string>();

        if (user) {
          console.log('Feed - Loading user interactions for videos:', {
            videoIds: videos.map((v: DatabaseVideo) => v.id),
            userIds: videos.map((v: DatabaseVideo) => v.user_id)
          });

          const [{ data: likes }, { data: follows }, { data: saves }] = await Promise.all([
            supabase
              .from("likes")
              .select("video_id")
              .eq('user_id', user.id)
              .in('video_id', videos.map((v: DatabaseVideo) => v.id)),
            supabase
              .from("follows")
              .select("following_id")
              .eq('follower_id', user.id)
              .in('following_id', videos.map((v: DatabaseVideo) => v.user_id)),
            supabase
              .from("saves")
              .select("video_id")
              .eq('user_id', user.id)
              .in('video_id', videos.map((v: DatabaseVideo) => v.id))
          ]);

          console.log('Feed - User interactions loaded:', {
            likes: likes?.length ?? 0,
            follows: follows?.map(f => f.following_id) ?? [],
            saves: saves?.length ?? 0
          });

          likeMap = new Set(likes?.map(l => l.video_id) ?? []);
          // Update followMapRef with new follows
          const newFollows = new Set(follows?.map(f => f.following_id) ?? []);
          followMapRef.current = newFollows;
          saveMap = new Set(saves?.map(s => s.video_id) ?? []);
        }

          console.log('Feed - Transforming videos with interactions:', {
            totalVideos: videos.length,
            followMap: Array.from(followMapRef.current)
          });

          const transformedVideos: Video[] = videos.map((video: DatabaseVideo) => {
            const isFollowing = followMapRef.current.has(video.user_id);
            console.log('Feed - Video follow status:', {
              videoId: video.id,
              userId: video.user_id,
              isFollowing,
              followerCount: video.profiles.follower_count
            });

            return {
              ...video,
              profiles: {
                username: video.profiles.username,
                follower_count: video.profiles.follower_count,
                following_count: video.profiles.following_count
              },
              is_liked: likeMap.has(video.id),
              is_following: isFollowing,
              is_saved: saveMap.has(video.id),
            };
          });

        setVideos(transformedVideos);

        if (videoId) {
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error("Error loading videos:", error);
      }
    };

    loadVideos();
  }, [videoId, user?.id]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const element = document.getElementById(`video-${currentIndex - 1}`);
      element?.scrollIntoView({ behavior: "smooth" });
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      const element = document.getElementById(`video-${currentIndex + 1}`);
      element?.scrollIntoView({ behavior: "smooth" });
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleScroll = useCallback((e: Event) => {
    const container = e.target as HTMLElement;
    const scrollTop = container.scrollTop;
    const itemHeight = window.innerHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex]);

  useEffect(() => {
    const container = document.querySelector('.snap-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="relative ml-16 lg:ml-64 bg-gray-100 dark:bg-gray-900">
      <VideoNavigation
        onPrevious={handlePrevious}
        onNext={handleNext}
        showPrevious={currentIndex > 0}
        showNext={currentIndex < videos.length - 1}
      />
      <div className="snap-container">
        {videos.map((video, index) => (
          <div key={video.id} id={`video-${index}`}>
            <VideoPlayer video={video} isActive={index === currentIndex} />
          </div>
        ))}
      </div>
    </div>
  );
}
