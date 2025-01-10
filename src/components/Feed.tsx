import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { VideoNavigation } from "./VideoNavigation";
import { useAuth } from "../context/AuthContext";
import { VideoPlayer } from "./VideoPlayer";
import { Video, DatabaseVideo, Like, Follow, Save } from "../types/video";
import { fetchSingle, fetchMany } from "../utils/supabase";

export function Feed(): JSX.Element {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user } = useAuth();
  const { videoId } = useParams<{ videoId?: string }>();

  const fetchVideos = useCallback(async (): Promise<void> => {
    try {
      const response = await fetchMany<DatabaseVideo>(
        supabase
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
            profiles (
              username,
              follower_count,
              following_count
            )
          `)
          .order("created_at", { ascending: false })
      );

      if (!response.error && response.data) {
        const transformedVideos: Video[] = response.data.map((video) => ({
          ...video,
          profiles: video.profiles,
          is_liked: false,
          is_following: false,
          is_saved: false,
        }));

        if (user) {
          const videosWithInteractions = await Promise.all(
            transformedVideos.map(async (video) => {
              const [likeResponse, followResponse, saveResponse] = await Promise.all([
                fetchSingle<Like>(
                  supabase
                    .from("likes")
                    .select("id")
                    .eq("video_id", video.id)
                    .eq("user_id", user.id)
                    .maybeSingle()
                ),
                fetchSingle<Follow>(
                  supabase
                    .from("follows")
                    .select("id")
                    .eq("following_id", video.user_id)
                    .eq("follower_id", user.id)
                    .maybeSingle()
                ),
                fetchSingle<Save>(
                  supabase
                    .from("saves")
                    .select("id")
                    .eq("video_id", video.id)
                    .eq("user_id", user.id)
                    .maybeSingle()
                ),
              ]);

              return {
                ...video,
                is_liked: !!likeResponse.data,
                is_following: !!followResponse.data,
                is_saved: !!saveResponse.data,
              };
            })
          );

          setVideos(videosWithInteractions);
        } else {
          setVideos(transformedVideos);
        }

        // If we have a videoId, find its index
        if (videoId) {
          const index = transformedVideos.findIndex(v => v.id === videoId);
          if (index !== -1) {
            setCurrentIndex(index);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  }, [user, videoId]);

  useEffect(() => {
    const loadVideos = async (): Promise<void> => {
      try {
        if (videoId) {
          // Fetch specific video
          const response = await fetchSingle<DatabaseVideo>(
            supabase
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
                profiles (
                  username,
                  follower_count,
                  following_count
                )
              `)
              .eq("id", videoId)
              .maybeSingle()
          );

          if (response.data) {
            const video = {
              ...response.data,
              profiles: response.data.profiles,
              is_liked: false,
              is_following: false,
              is_saved: false,
            };
            
            if (user) {
              const [likeResponse, followResponse, saveResponse] = await Promise.all([
                fetchSingle<Like>(
                  supabase
                    .from("likes")
                    .select("id")
                    .eq("video_id", video.id)
                    .eq("user_id", user.id)
                    .maybeSingle()
                ),
                fetchSingle<Follow>(
                  supabase
                    .from("follows")
                    .select("id")
                    .eq("following_id", video.user_id)
                    .eq("follower_id", user.id)
                    .maybeSingle()
                ),
                fetchSingle<Save>(
                  supabase
                    .from("saves")
                    .select("id")
                    .eq("video_id", video.id)
                    .eq("user_id", user.id)
                    .maybeSingle()
                ),
              ]);

              video.is_liked = !!likeResponse.data;
              video.is_following = !!followResponse.data;
              video.is_saved = !!saveResponse.data;
            }
            
            setVideos([video]);
            setCurrentIndex(0);
          }
        } else {
          await fetchVideos();
        }
      } catch (error) {
        console.error("Error loading videos:", error);
      }
    };

    loadVideos();
  }, [videoId, user, fetchVideos]);

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
            <VideoPlayer video={video} />
          </div>
        ))}
      </div>
    </div>
  );
}
