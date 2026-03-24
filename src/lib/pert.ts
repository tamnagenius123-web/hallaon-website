/**
 * PERT/CPM Algorithm for Hanraon
 * Calculates Expected Time (TE) and Critical Path
 * Predecessor is based on WBS code, not task id
 */

import { Task } from '../types';

/**
 * Calculate Expected Time (TE) using PERT formula: (a + 4m + b) / 6
 */
export const calculateTE = (task: Task): number => {
  const o = task.opt_time || 0;
  const m = task.prob_time || 0;
  const p = task.pess_time || 0;
  return (o + 4 * m + p) / 6;
};

/**
 * Forward Pass & Backward Pass to find Critical Path
 * Predecessor is matched by wbs_code
 */
export const calculateCriticalPath = (tasks: Task[]): Task[] => {
  if (!tasks || tasks.length === 0) return [];
  
  const processedTasks = tasks.map(t => ({ 
    ...t, 
    exp_time: calculateTE(t),
    es: 0, ef: 0, ls: 0, lf: 0, slack: 0, is_critical: false
  }));
  
  // Map wbs_code -> task for predecessor lookup
  const byWbs: Record<string, typeof processedTasks[0]> = {};
  processedTasks.forEach(t => {
    if (t.wbs_code) byWbs[t.wbs_code.trim()] = t;
  });

  // 1. Forward Pass (topological order)
  // Repeated passes to handle dependencies
  for (let pass = 0; pass < processedTasks.length; pass++) {
    processedTasks.forEach(task => {
      if (!task.predecessor || !task.predecessor.trim()) {
        task.es = 0;
        task.ef = task.exp_time!;
      } else {
        const pred = byWbs[task.predecessor.trim()];
        if (pred) {
          task.es = pred.ef || 0;
          task.ef = task.es + (task.exp_time || 0);
        } else {
          task.es = 0;
          task.ef = task.exp_time!;
        }
      }
    });
  }

  // 2. Backward Pass
  const maxEF = Math.max(...processedTasks.map(t => t.ef || 0), 0);
  
  processedTasks.forEach(task => {
    task.lf = maxEF;
    task.ls = maxEF - (task.exp_time || 0);
  });

  // Find successors for each task and update lf/ls
  for (let pass = 0; pass < processedTasks.length; pass++) {
    processedTasks.forEach(task => {
      const successors = processedTasks.filter(s => 
        s.predecessor && s.predecessor.trim() === task.wbs_code?.trim()
      );
      
      if (successors.length === 0) {
        task.lf = maxEF;
      } else {
        task.lf = Math.min(...successors.map(s => s.ls !== undefined ? s.ls : maxEF));
      }
      task.ls = task.lf - (task.exp_time || 0);
      task.slack = task.lf - (task.ef || 0);
      task.is_critical = Math.abs(task.slack) < 0.001;
    });
  }

  return processedTasks;
};
