import React from "react";
import { Timer, Briefcase } from "lucide-react";

export function Logo(): JSX.Element {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <Timer className="w-8 h-8 text-blue-500" />
        <Briefcase className="w-4 h-4 text-blue-700 absolute -bottom-1 -right-1" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
          3 Min Pitch
        </span>
      </div>
    </div>
  );
}
