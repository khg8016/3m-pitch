import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface VideoNavigationProps {
  onPrevious: () => void;
  onNext: () => void;
  showPrevious: boolean;
  showNext: boolean;
}

export function VideoNavigation({
  onPrevious,
  onNext,
  showPrevious,
  showNext,
}: VideoNavigationProps): JSX.Element {
  return (
    <>
      {/* Previous Button */}
      {showPrevious && (
        <button
          onClick={onPrevious}
          className="fixed left-20 lg:left-72 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      )}

      {/* Next Button */}
      {showNext && (
        <button
          onClick={onNext}
          className="fixed right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      )}
    </>
  );
}
