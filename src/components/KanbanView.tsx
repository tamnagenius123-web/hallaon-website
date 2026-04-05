/**
 * KanbanView - Drag & Drop Kanban Board for Tasks
 */
import React, { useState, useCallback } from 'react';
import { Task } from '../types';
import { useAppContext } from '../App';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { User, Calendar, Flag, Columns3 } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useToast } from './Toast';

const COLUMNS = ['시작 전', '대기', '진행 중', '작업 중', '막힘', '완료'];

const COLUMN_COLORS: Record<string, string> = {
  '시작 전': 'bg-gray-100 dark:bg-gray-800',
  '대기': 'bg-purple-50 dark:bg-purple-900/20',
  '진행 중': 'bg-blue-50 dark:bg-blue-900/20',
  '작업 중': 'bg-sky-50 dark:bg-sky-900/20',
  '막힘': 'bg-red-50 dark:bg-red-900/20',
  '완료': 'bg-green-50 dark:bg-green-900/20',
};

const COLUMN_ACCENT: Record<string, string> = {
  '시작 전': 'border-t-gray-400',
  '대기': 'border-t-purple-400',
  '진행 중': 'border-t-blue-500',
  '작업 중': 'border-t-sky-500',
  '막힘': 'border-t-red-500',
  '완료': 'border-t-green-500',
};

interface KanbanViewProps {
  tasks: Task[];
}

export const KanbanView = ({ tasks }: KanbanViewProps) => {
  const { optimisticUpdateTask } = useAppContext();
  const { showToast } = useToast();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = useCallback(async (status: string) => {
    setDragOverColumn(null);
    if (!draggedTask || draggedTask.status === status) {
      setDraggedTask(null);
      return;
    }

    const previousStatus = draggedTask.status;
    
    // Optimistic update
    optimisticUpdateTask(draggedTask.id, { status });

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', draggedTask.id);
      if (error) throw error;
      showToast(`"${draggedTask.title}" → ${status}`, 'success');
    } catch (err) {
      // Rollback on failure
      optimisticUpdateTask(draggedTask.id, { status: previousStatus });
      showToast('상태 변경 실패', 'error');
    }
    setDraggedTask(null);
  }, [draggedTask, optimisticUpdateTask, showToast]);

  return (
    <div className="animate-fade-in space-y-6 px-4 py-8 max-w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
          <Columns3 size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">칸반 보드</h1>
          <p className="text-sm text-muted-foreground">업무를 드래그하여 상태를 변경합니다.</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 300px)' }}>
        {COLUMNS.map(status => {
          const columnTasks = tasks.filter(t => t.status === status);
          const isDropTarget = dragOverColumn === status;

          return (
            <div
              key={status}
              className={cn(
                'min-w-[280px] w-[280px] flex-shrink-0 rounded-xl border-t-3 transition-all',
                COLUMN_ACCENT[status],
                isDropTarget && 'ring-2 ring-primary/50 scale-[1.01]'
              )}
              onDragOver={e => handleDragOver(e, status)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(status)}
            >
              {/* Column Header */}
              <div className={cn('px-3 py-3 rounded-t-xl', COLUMN_COLORS[status])}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{status}</span>
                  <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full font-bold">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="space-y-2 p-2 min-h-[100px]">
                {columnTasks.map(task => (
                  <motion.div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'notion-card p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow',
                      task.is_critical && 'border-red-200 dark:border-red-800',
                      draggedTask?.id === task.id && 'opacity-50'
                    )}
                  >
                    {task.is_critical && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <Flag size={10} className="text-red-500" />
                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Critical Path</span>
                      </div>
                    )}
                    <div className="font-medium text-sm leading-snug mb-2">{task.title}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <User size={10} />
                          <span>{task.assignee}</span>
                        </div>
                      )}
                      {task.end_date && (
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          <span>{formatDate(task.end_date)}</span>
                        </div>
                      )}
                    </div>
                    {task.wbs_code && (
                      <div className="mt-1.5">
                        <span className="text-[10px] font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          {task.wbs_code}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-8 opacity-50">
                    비어 있음
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
