import React, { useState } from 'react';
import { X, Play, Upload as UploadIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createTalkingVideo } from '../lib/heygen';
import { useAuth } from '../context/AuthContext';

interface UploadStudioProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadStudio({ isOpen, onClose }: UploadStudioProps) {
  const { user } = useAuth();
  const [script, setScript] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerateVideo = async () => {
    if (!script.trim()) {
      setError('Please write a script first');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      if (!user) {
        setError('Please sign in to generate videos');
        return;
      }

      const videoUrl = await createTalkingVideo({ 
        script,
        onStatusChange: (status: string) => setGeneratingStatus(status)
      });
      setGeneratedVideo(videoUrl);
    } catch (err: any) {
      console.error('Generation error:', err);
      if (err.message?.includes('Authentication failed') || err.message?.includes('Unauthorized')) {
        setError('Authentication error. Please try signing out and signing in again.');
      } else {
        setError('Failed to generate video: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleUpload = async () => {
    if (!generatedVideo || !user) return;

    setUploading(true);
    setError('');

    try {
      // Download video from Heygen URL
      const response = await fetch(generatedVideo);
      if (!response.ok) throw new Error('Failed to download video');
      const blob = await response.blob();

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.mp4`;
      const { error: uploadError, data } = await supabase.storage
        .from('videos')
        .upload(fileName, blob);

      if (uploadError) throw uploadError;

      // Create video record with relative path
      const { error: dbError } = await supabase
        .from('videos')
        .insert([
          {
            user_id: user.id,
            title,
            description,
            video_url: fileName, // Store only the relative path
            script,
            is_uploaded: true
          }
        ]);

      if (dbError) throw dbError;

      onClose();
      setScript('');
      setTitle('');
      setDescription('');
      setGeneratedVideo(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold dark:text-white">AI Pitch Studio</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Script Editor */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Script
              </label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                rows={10}
                placeholder="Write your pitch script here..."
                required
              />
            </div>

            <button
              onClick={handleGenerateVideo}
              disabled={generating || !script.trim()}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>
                {generating 
                  ? generatingStatus || 'Starting generation...'
                  : 'Generate Video'
                }
              </span>
            </button>
          </div>

          {/* Video Preview */}
          <div className="space-y-4">
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              {generatedVideo ? (
                <video
                  src={generatedVideo}
                  controls
                  className="w-full h-full rounded-lg"
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <UploadIcon className="w-12 h-12 mx-auto mb-2" />
                  <p>Generated video will appear here</p>
                </div>
              )}
            </div>

            {generatedVideo && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <UploadIcon className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : 'Upload Video'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
