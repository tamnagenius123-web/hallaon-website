/**
 * PERT/CPM Algorithm for Hanraon
 * Calculates Expected Time (TE) and Critical Path
 * Predecessor is based on WBS code, supports comma-separated multiple predecessors
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
 * Predecessor supports comma-separated WBS codes (e.g. "1.1, 1.2")
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

  /**
   * Parse predecessor string into array of WBS codes
   * Supports: "1.1", "1.1, 1.2", "1.1,1.2,1.3"
   */
  const parsePredecessors = (pred?: string): string[] => {
    if (!pred || !pred.trim()) return [];
    return pred.split(',').map(s => s.trim()).filter(Boolean);
  };

  // 1. Forward Pass — supports multiple predecessors
  for (let pass = 0; pass < processedTasks.length; pass++) {
    processedTasks.forEach(task => {
      const predCodes = parsePredecessors(task.predecessor);
      
      if (predCodes.length === 0) {
        task.es = 0;
        task.ef = task.exp_time!;
      } else {
        // ES = max(EF of all predecessors)
        let maxEF = 0;
        for (const code of predCodes) {
          const pred = byWbs[code];
          if (pred && (pred.ef || 0) > maxEF) {
            maxEF = pred.ef || 0;
          }
        }
        task.es = maxEF;
        task.ef = task.es + (task.exp_time || 0);
      }
    });
  }

  // 2. Backward Pass
  const maxEF = Math.max(...processedTasks.map(t => t.ef || 0), 0);

  for (let pass = 0; pass < processedTasks.length; pass++) {
    processedTasks.forEach(task => {
      // Find all successors (tasks that list this task as predecessor)
      const successors = processedTasks.filter(s => {
        const predCodes = parsePredecessors(s.predecessor);
        return predCodes.includes(task.wbs_code?.trim() || '');
      });
      
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
