import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Heart, Send } from 'lucide-react';

interface Profile {
  username: string;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: Profile;
  likes: number;
  is_liked?: boolean;
}

interface DatabaseComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes: number;
  profiles: Profile;
  video_id: string;
}

interface CommentsProps {
  videoId: string;
}

export function Comments({ videoId }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();
    
    const channel = supabase
      .channel('comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `video_id=eq.${videoId}`
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId]);

  const loadComments = async () => {
    try {
      const { data, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          likes,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      const transformedComments: Comment[] = (data || []).map((rawComment) => {
        const comment = rawComment as unknown as DatabaseComment;
        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          likes: comment.likes,
          profile: comment.profiles,
          is_liked: false
        };
      });

      if (user) {
        const commentsWithLikes = await Promise.all(
          transformedComments.map(async (comment) => {
            const { data: likeData } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .maybeSingle();

            return {
              ...comment,
              is_liked: !!likeData
            };
          })
        );
        setComments(commentsWithLikes);
      } else {
        setComments(transformedComments);
      }
    } catch (err: any) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const profile = { id: user.id };

      if (!profile) throw new Error('Profile not found');

      const { error } = await supabase
        .from('comments')
        .insert([
          {
            video_id: videoId,
            user_id: profile.id,
            content: newComment.trim(),
            likes: 0
          }
        ]);

      if (error) throw error;
      setNewComment('');
    } catch (err: any) {
      console.error('Error posting comment:', err);
      setError('Failed to post comment');
    }
  };

  const handleLike = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      // 즉시 UI 업데이트
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            is_liked: !isLiked,
            likes: isLiked ? comment.likes - 1 : comment.likes + 1
          };
        }
        return comment;
      }));

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('comment_likes')
          .insert([
            {
              comment_id: commentId,
              user_id: user.id
            }
          ]);

        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error toggling like:', err);
      // 에러 발생 시 UI 롤백
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            is_liked: isLiked,
            likes: isLiked ? comment.likes + 1 : comment.likes - 1
          };
        }
        return comment;
      }));
    }
  };

  const formatTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm';
    
    return Math.floor(seconds) + 's';
  };

  if (loading) return (
    <div className="flex items-center justify-center p-4">
      <div className="w-6 h-6 border-2 border-red-500 rounded-full animate-spin border-t-transparent"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute inset-x-0 top-0 bottom-[80px] p-4 space-y-4 overflow-y-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden">
                <img
                  src={comment.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.profile.username}`}
                  alt={comment.profile.username}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-black dark:text-white">
                {comment.profile.username}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                {comment.content}
              </p>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTimeAgo(comment.created_at)}
                </span>
                <button 
                  className={`text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-500 ${comment.is_liked ? 'text-red-500' : ''}`}
                  onClick={() => handleLike(comment.id, comment.is_liked || false)}
                >
                  <Heart className={`w-4 h-4 ${comment.is_liked ? 'fill-current' : ''}`} />
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {comment.likes || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {user && (
        <div className="absolute bottom-6 left-0 right-0 p-4 border-t dark:border-gray-800 bg-white dark:bg-black/95">
          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add comment..."
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
              required
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="p-2 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
