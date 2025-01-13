import React, { useRef, useState } from "react";
import {
  Play,
  Volume2,
  VolumeX,
  Music2,
} from "lucide-react";
import { Video } from "../types/video";
import { formatHashtags } from "../utils/format";

export function PreviewVideoPlayer({
  video: initialVideo,
}: {
  video: Video;
}): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

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
    <div className="relative bg-black h-full">
      <div className="h-full">
        {/* Video Container */}
        <div className="relative w-full h-full bg-black/95 overflow-hidden">
          {/* Title section */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <h1 className="text-white text-xl font-bold">{initialVideo.title}</h1>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            src={initialVideo.video_url}
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
                  @{initialVideo.profiles.username}
                </span>
                <span className="ml-2 text-sm text-white/80">
                  {new Date(initialVideo.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-white text-sm mb-2">
                {formatHashtags(initialVideo.description)}
              </p>
              <div className="flex items-center">
                <Music2 className="w-4 h-4 text-white mr-2" />
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-100 rounded-full overflow-hidden mr-2 music-disc">
                    <img
                      src={`https://api.dicebear.com/7.x/shapes/svg?seed=${initialVideo.id}`}
                      alt="Music"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-white text-sm">
                    Original Sound - {initialVideo.profiles.username}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
