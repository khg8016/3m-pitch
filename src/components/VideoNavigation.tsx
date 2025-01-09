import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface VideoNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  showPrevious: boolean;
  showNext: boolean;
}

export function VideoNavigation({ onPrevious, onNext, showPrevious, showNext }: VideoNavigationProps) {
  return (
    <div className="fixed right-8 h-screen flex flex-col justify-center gap-4 z-10">
      {showPrevious && (
        <button
          onClick={onPrevious}
          className="w-12 h-12 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center transition-colors"
          aria-label="Previous video"
        >
          <ChevronUp className="w-8 h-8 text-white" />
        </button>
      )}
      {showNext && (
        <button
          onClick={onNext}
          className="w-12 h-12 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center transition-colors"
          aria-label="Next video"
        >
          <ChevronDown className="w-8 h-8 text-white" />
        </button>
      )}
    </div>
  );
}