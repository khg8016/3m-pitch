import React from "react";
import { Video as VideoIcon } from "lucide-react";
import { Video } from "../types/video";
import { PreviewVideoPlayer } from "./PreviewVideoPlayer";

interface PreviewFeedProps {
  video: Video | null;
}

export function PreviewFeed({ video }: PreviewFeedProps): JSX.Element {
  return (
    <div className="h-full w-full bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="h-12 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 flex items-center px-4">
        <span className="text-sm font-medium text-gray-900 dark:text-white">3M Pitch</span>
      </div>

      {/* Feed */}
      <div className="h-[calc(100%-3rem)] w-full overflow-hidden">
        {video ? (
          <div className="h-full">
            <PreviewVideoPlayer video={video} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <VideoIcon className="w-12 h-12" />
          </div>
        )}
      </div>
    </div>
  );
}
