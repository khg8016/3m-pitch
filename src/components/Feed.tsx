import React, { useEffect, useState, useCallback } from "react";
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

  useEffect(() => {
    const loadVideos = async (): Promise<void> => {
      try {
        if (!user) {
          setVideos([]);
          return;
        }

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

        // If videoId is provided, filter for that specific video
        if (videoId) {
          query = query.eq("id", videoId);
        }

        const { data: videos, error: videosError } = await query as any;

        if (videosError) throw videosError;
        if (!videos || videos.length === 0) return;

        // Get user interactions in parallel
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

        // Create maps for quick lookup
        const likeMap = new Set(likes?.map(l => l.video_id) ?? []);
        const followMap = new Set(follows?.map(f => f.following_id) ?? []);
        const saveMap = new Set(saves?.map(s => s.video_id) ?? []);

        const transformedVideos: Video[] = videos.map((video: DatabaseVideo) => ({
          ...video,
          profiles: {
            username: video.profiles.username,
            follower_count: video.profiles.follower_count,
            following_count: video.profiles.following_count
          },
          is_liked: likeMap.has(video.id),
          is_following: followMap.has(video.user_id),
          is_saved: saveMap.has(video.id),
        }));

        setVideos(transformedVideos);

        // If we have a videoId, set the current index to 0
        if (videoId) {
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error("Error loading videos:", error);
      }
    };

    loadVideos();
  }, [videoId, user?.id]); // Only depend on user.id instead of the entire user object

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
