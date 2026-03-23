/**
 * PERT/CPM Algorithm for Hanraon
 * Calculates Expected Time (TE) and Critical Path
 */

import { Task } from '../types';

/**
 * Calculate Expected Time (TE) using PERT formula: (a + 4m + b) / 6
 */
export const calculateTE = (task: Task): number => {
  return (task.opt_time + 4 * task.prob_time + task.pess_time) / 6;
};

/**
 * Forward Pass & Backward Pass to find Critical Path
 */
export const calculateCriticalPath = (tasks: Task[]): Task[] => {
  const processedTasks = tasks.map(t => ({ ...t, exp_time: calculateTE(t) }));
  
  // 1. Forward Pass
  processedTasks.forEach(task => {
    if (!task.predecessor) {
      task.es = 0;
      task.ef = task.exp_time!;
    } else {
      const pred = processedTasks.find(p => p.id === task.id); // This was wrong in previous version, should find predecessor
      const actualPred = processedTasks.find(p => p.id === task.predecessor);
      task.es = actualPred?.ef || 0;
      task.ef = task.es + task.exp_time!;
    }
  });

  // 2. Backward Pass
  const maxEF = Math.max(...processedTasks.map(t => t.ef || 0));
  
  // Sort reverse to process from end to start
  const reversed = [...processedTasks].reverse();
  reversed.forEach(task => {
    // Find tasks that depend on this one
    const successors = processedTasks.filter(s => s.predecessor === task.id);
    
    if (successors.length === 0) {
      task.lf = maxEF;
      task.ls = task.lf - task.exp_time!;
    } else {
      task.lf = Math.min(...successors.map(s => s.ls || maxEF));
      task.ls = task.lf - task.exp_time!;
    }
    
    task.slack = task.lf - task.ef!;
    task.is_critical = task.slack === 0;
  });

  return processedTasks;
};
