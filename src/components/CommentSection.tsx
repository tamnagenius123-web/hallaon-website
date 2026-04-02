/**
 * CommentSection - Notion-style comment system
 * Reusable for Tasks, Agendas, Docs
 * Uses Supabase Realtime for live updates + Optimistic UI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Comment } from '../types';
import { useAppContext } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Trash2, Pencil, X, Check, MoreHorizontal } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

interface CommentSectionProps {
  targetId: string;
  targetType: 'task' | 'agenda' | 'doc';
}

export const CommentSection = ({ targetId, targetType }: CommentSectionProps) => {
  const { session } = useAppContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentUser = session?.user?.name || session?.user?.email || '';

  // Fetch existing comments
  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('target_id', targetId)
        .eq('target_type', targetType)
        .order('created_at', { ascending: true });

      if (error) {
        // Table might not exist yet - that's ok
        console.warn('Comments table not available:', error.message);
        setComments([]);
      } else {
        setComments(data || []);
      }
    } catch {
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [targetId, targetType]);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchComments();

    const channel = supabase
      .channel(`comments-${targetId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `target_id=eq.${targetId}`,
      }, (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'INSERT' && newRow) {
          setComments(prev => {
            if (prev.some(c => c.id === (newRow as Comment).id)) return prev;
            return [...prev, newRow as Comment];
          });
        } else if (eventType === 'UPDATE' && newRow) {
          setComments(prev => prev.map(c => c.id === (newRow as Comment).id ? { ...c, ...(newRow as Comment) } : c));
        } else if (eventType === 'DELETE' && oldRow) {
          setComments(prev => prev.filter(c => c.id !== (oldRow as any).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, fetchComments]);

  // Post a new comment
  const handlePost = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content: newComment.trim(),
      user_id: session?.user?.id || '',
      user_name: currentUser,
      target_type: targetType,
      target_id: targetId,
      created_at: new Date().toISOString(),
    };

    // Optimistic add
    setComments(prev => [...prev, optimisticComment]);
    setNewComment('');

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          content: optimisticComment.content,
          user_id: optimisticComment.user_id,
          user_name: optimisticComment.user_name,
          target_type: targetType,
          target_id: targetId,
        }])
        .select()
        .single();

      if (error) throw error;

      // Replace temp with real
      if (data) {
        setComments(prev => prev.map(c => c.id === optimisticComment.id ? (data as Comment) : c));
      }
    } catch (err) {
      // Rollback optimistic add
      setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      console.error('Comment post failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Update comment
  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    const prev = comments.find(c => c.id === id);
    
    // Optimistic update
    setComments(cs => cs.map(c => c.id === id ? { ...c, content: editContent.trim(), updated_at: new Date().toISOString() } : c));
    setEditingId(null);

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    } catch {
      // Rollback
      if (prev) setComments(cs => cs.map(c => c.id === id ? prev : c));
    }
  };

  // Delete comment
  const handleDelete = async (id: string) => {
    const prev = comments.find(c => c.id === id);
    setComments(cs => cs.filter(c => c.id !== id));

    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    } catch {
      if (prev) setComments(cs => [...cs, prev].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    }
  };

  const formatCommentTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금 전';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <MessageSquare size={16} />
        <span>댓글</span>
        {comments.length > 0 && (
          <span className="text-xs bg-secondary px-1.5 py-0.5 rounded-full">{comments.length}</span>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-3">
        <AnimatePresence>
          {comments.map((comment) => {
            const isOwn = comment.user_name === currentUser;
            const isEditing = editingId === comment.id;

            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="group flex gap-3"
              >
                {/* Avatar */}
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5",
                  isOwn ? "bg-primary" : "bg-muted-foreground"
                )}>
                  {comment.user_name?.[0]?.toUpperCase() || 'U'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{comment.user_name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatCommentTime(comment.created_at)}
                      {comment.updated_at && ' (수정됨)'}
                    </span>

                    {/* Actions (own comments only) */}
                    {isOwn && !isEditing && (
                      <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                          className="p-1 hover:bg-secondary rounded text-muted-foreground"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-muted-foreground"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="flex gap-2">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="flex-1 text-sm p-2 rounded-md border border-border bg-secondary resize-none outline-none focus:ring-1 focus:ring-ring"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleUpdate(comment.id)} className="p-1 hover:bg-green-50 rounded text-green-600">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 hover:bg-secondary rounded text-muted-foreground">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                      {comment.content}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {comments.length === 0 && !loading && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
          </div>
        )}
      </div>

      {/* New Comment Input */}
      <div className="flex gap-2 items-start pt-2 border-t border-border">
        <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
          {currentUser?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePost();
              }
            }}
            placeholder="댓글을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
            className="w-full text-sm p-2 pr-10 rounded-md border border-border bg-transparent resize-none outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            rows={2}
          />
          <button
            onClick={handlePost}
            disabled={!newComment.trim() || submitting}
            className={cn(
              "absolute right-2 bottom-2 p-1.5 rounded-md transition-colors",
              newComment.trim()
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground/40 cursor-not-allowed"
            )}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
