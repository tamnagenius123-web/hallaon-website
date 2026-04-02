import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Task, UserWorkload, PresenceUser } from "../types";
import { TEAM_MEMBERS, expandAssignees } from "./orgChart";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Workload Analysis: Calculate per-user task statistics
 * Returns sorted array (ascending by score = most available first)
 */
export function getWorkloadStats(tasks: Task[]): UserWorkload[] {
  // Collect all unique member names from org chart
  const allMembers = new Set<string>();
  Object.values(TEAM_MEMBERS).forEach(members => members.forEach(m => allMembers.add(m)));

  const stats: Record<string, { taskCount: number; completedCount: number; blockedCount: number }> = {};

  // Initialize all members
  allMembers.forEach(name => {
    stats[name] = { taskCount: 0, completedCount: 0, blockedCount: 0 };
  });

  // Count tasks per assignee
  tasks.forEach(task => {
    const assignees = expandAssignees(task.assignee || '');
    assignees.forEach(name => {
      if (name === '미정') return;
      if (!stats[name]) stats[name] = { taskCount: 0, completedCount: 0, blockedCount: 0 };

      if (task.status === '완료') {
        stats[name].completedCount++;
      } else {
        stats[name].taskCount++;
        if (task.status === '막힘') {
          stats[name].blockedCount++;
        }
      }
    });
  });

  // Calculate scores and sort
  return Object.entries(stats)
    .map(([name, data]) => ({
      userId: name,
      userName: name,
      taskCount: data.taskCount,
      completedCount: data.completedCount,
      blockedCount: data.blockedCount,
      // Score: active tasks weighted, blocked tasks add extra weight
      score: data.taskCount + data.blockedCount * 0.5,
    }))
    .sort((a, b) => a.score - b.score);
}

/**
 * Get the top N most available members
 */
export function getMostAvailableMembers(tasks: Task[], count = 3): UserWorkload[] {
  return getWorkloadStats(tasks).slice(0, count);
}

/**
 * Get recommended assignees for a new task (sorted by availability)
 */
export function getRecommendedAssignees(tasks: Task[]): UserWorkload[] {
  return getWorkloadStats(tasks);
}

export const NOTION_COLORS = {
  default: "bg-transparent text-foreground",
  gray: "bg-[#F1F1EF] text-[#787774] dark:bg-[#2F2F2F] dark:text-[#9B9B9B]",
  brown: "bg-[#F4EEEE] text-[#976D57] dark:bg-[#3F2C23] dark:text-[#937264]",
  orange: "bg-[#FAEBDD] text-[#D9730D] dark:bg-[#432908] dark:text-[#FFA344]",
  yellow: "bg-[#FBF3DB] text-[#CB912F] dark:bg-[#392A06] dark:text-[#FFDC49]",
  green: "bg-[#EDF3EC] text-[#448361] dark:bg-[#1C281A] dark:text-[#4DAB9A]",
  blue: "bg-[#E7F3F8] text-[#337EA9] dark:bg-[#142831] dark:text-[#529CCA]",
  purple: "bg-[#F5F0F8] text-[#9065B0] dark:bg-[#2B1E33] dark:text-[#9A6DD7]",
  pink: "bg-[#F9EEF3] text-[#AD578D] dark:bg-[#301A23] dark:text-[#E255A1]",
  red: "bg-[#FDEBEC] text-[#D44C47] dark:bg-[#361B18] dark:text-[#FF7369]",
};
