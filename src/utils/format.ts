import React, { ReactNode } from 'react';

export function formatNumber(num: number | null | undefined): string | number {
  if (num === null || num === undefined) return 0;
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num;
}

export function formatHashtags(text: string): ReactNode[] {
  return text.split(" ").map((word: string, index: number) => {
    if (word.startsWith("#")) {
      return React.createElement(
        "span",
        { key: index, className: "hashtag" },
        `${word} `
      );
    }
    return word + " ";
  });
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
