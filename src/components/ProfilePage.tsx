import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Play, Heart, MessageCircle } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  created_at: string;
}

interface Profile {
  username: string;
  bio: string;
  avatar_url: string;
  followers_count: number;
  following_count: number;
}

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndVideos = async () => {
      if (!user) return;

      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch user's videos
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (videosError) throw videosError;
        setVideos(videosData);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndVideos();
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Please log in to view your profile
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
          <img
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {profile?.username}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
          {profile?.bio || 'No bio yet'}
        </p>
        <div className="flex space-x-8">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {videos.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Videos</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {profile?.followers_count || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {profile?.following_count || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Following</div>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {videos.map((video) => (
          <div key={video.id} className="relative aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden group">
            <video
              src={supabase.storage.from('videos').getPublicUrl(video.video_url).data.publicUrl}
              className="w-full h-full object-cover"
              poster={video.thumbnail_url}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white space-y-2">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center">
                    <Play className="w-4 h-4 mr-1" />
                    <span>{video.views || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 mr-1" />
                    <span>{video.likes || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    <span>0</span>
                  </div>
                </div>
                <div className="text-sm text-center">{video.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No videos uploaded yet</p>
        </div>
      )}
    </div>
  );
}
