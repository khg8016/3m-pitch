import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Video, DatabaseVideo } from "../types/video";
import { fetchMany } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";

interface Profile {
  username: string;
  follower_count: number;
  following_count: number;
  avatar_url?: string;
}

type TabType = "videos" | "likes" | "saves";

export function ProfilePage(): JSX.Element {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("videos");

  const loadVideos = async (tab: TabType) => {
    setIsLoading(true);
    try {
      let videoIds: string[] = [];
      
      // For likes and saves, first get the video IDs
      if (tab === "likes" || tab === "saves") {
        const { data } = await supabase
          .from(tab)
          .select("video_id")
          .eq("user_id", userId);
          
        if (data) {
          videoIds = data.map(item => item.video_id);
          if (videoIds.length === 0) {
            setVideos([]);
            setIsLoading(false);
            return;
          }
        }
      }

      // Then fetch the videos
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
          profiles (
            username,
            follower_count,
            following_count
          )
        `)
        .order("created_at", { ascending: false });

      // Apply filters based on tab
      if (tab === "videos") {
        query = query.eq("user_id", userId);
      } else if (videoIds.length > 0) {
        query = query.in("id", videoIds);
      }

      const response = await fetchMany<DatabaseVideo>(query);

      if (!response.error && response.data) {
        const transformedVideos = response.data.map((video) => ({
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
                supabase
                  .from("likes")
                  .select("id")
                  .eq("video_id", video.id)
                  .eq("user_id", user.id)
                  .maybeSingle(),
                supabase
                  .from("follows")
                  .select("id")
                  .eq("following_id", video.user_id)
                  .eq("follower_id", user.id)
                  .maybeSingle(),
                supabase
                  .from("saves")
                  .select("id")
                  .eq("video_id", video.id)
                  .eq("user_id", user.id)
                  .maybeSingle(),
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
      }
    } catch (error) {
      console.error("Error loading videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;
        if (profileData) setProfile(profileData);

        await loadVideos("videos");
      } catch (error) {
        console.error("Error loading profile:", error);
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userId, user]);

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    await loadVideos(tab);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="ml-16 lg:ml-64 p-8">
      {/* Profile Header */}
      <div className="flex items-center gap-8 mb-12">
        <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <img
            src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
            alt={profile.username}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            @{profile.username}
          </h1>
          <div className="flex gap-8 text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">{videos.length}</span>{" "}
              videos
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">{profile.follower_count}</span>{" "}
              followers
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">{profile.following_count}</span>{" "}
              following
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-8">
        <nav className="flex gap-8">
          <button
            className={`pb-4 font-medium text-sm ${
              activeTab === "videos"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => handleTabChange("videos")}
          >
            Videos
          </button>
          <button
            className={`pb-4 font-medium text-sm ${
              activeTab === "likes"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => handleTabChange("likes")}
          >
            Likes
          </button>
          <button
            className={`pb-4 font-medium text-sm ${
              activeTab === "saves"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => handleTabChange("saves")}
          >
            Saved
          </button>
        </nav>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative group cursor-pointer"
            onClick={() => navigate(`/video/${video.id}`)}
          >
            <video
              src={supabase.storage.from("videos").getPublicUrl(video.video_url).data.publicUrl}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-center text-white">
                <div className="font-semibold mb-2">{video.title}</div>
                <div className="text-sm">{video.likes} likes</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
