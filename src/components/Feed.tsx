import React, { useRef, useEffect, useState } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Play, Volume2, VolumeX, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VideoNavigation } from './VideoNavigation';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url: string;
  views: number;
  likes: number;
  created_at: string;
  profiles: {
    username: string;
  };
}

function VideoPlayer({ video }: { video: Video }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
          } else if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
      videoRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

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

  const formatNumber = (num: number) => {
    return num >= 1000 ? `${(num / 1000).toFixed(1)}K` : num;
  };

  const videoUrl = supabase.storage
    .from('videos')
    .getPublicUrl(video.video_url).data.publicUrl;

  return (
    <div className="relative h-screen snap-start bg-black flex items-center justify-center">
      <div className="relative w-full h-full max-w-[calc(100vh*9/16)] mx-auto">
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-contain"
          playsInline
          muted={isMuted}
          onClick={togglePlayPause}
        />
        
        {!isPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlayPause}
          >
            <div className="bg-black/30 rounded-full p-4">
              <Play className="w-12 h-12 text-white" />
            </div>
          </div>
        )}

        <button
          onClick={toggleMute}
          className="absolute bottom-4 left-4 z-10 bg-black/30 p-2 rounded-full"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white" />
          ) : (
            <Volume2 className="w-6 h-6 text-white" />
          )}
        </button>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
          <div className="flex items-center mb-2">
            <span className="font-bold mr-2">{video.profiles.username}</span>
            <span className="ml-2 text-sm opacity-80">{new Date(video.created_at).toLocaleDateString()}</span>
          </div>
          <p className="mb-2">{video.title}</p>
          <p className="text-sm opacity-80">{video.description}</p>
        </div>

        {/* Right side interaction buttons */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-4">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full mb-1 overflow-hidden">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${video.profiles.username}`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <button className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center -mt-3">
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>

          <button className="flex flex-col items-center space-y-1">
            <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs">{formatNumber(video.likes)}</span>
          </button>

          <button className="flex flex-col items-center space-y-1">
            <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs">27</span>
          </button>

          <button className="flex flex-col items-center space-y-1">
            <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs">89</span>
          </button>

          <button className="flex flex-col items-center space-y-1">
            <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-xs">61</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function Feed() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          profiles (
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setVideos(data);
      }
    };

    fetchVideos();
  }, []);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const element = document.getElementById(`video-${currentIndex - 1}`);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      const element = document.getElementById(`video-${currentIndex + 1}`);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      <VideoNavigation
        onPrevious={handlePrevious}
        onNext={handleNext}
        showPrevious={currentIndex > 0}
        showNext={currentIndex < videos.length - 1}
      />
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
        {videos.map((video, index) => (
          <div key={video.id} id={`video-${index}`}>
            <VideoPlayer video={video} />
          </div>
        ))}
      </div>
    </div>
  );
}