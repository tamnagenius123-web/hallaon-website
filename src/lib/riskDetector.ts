/**
 * Automated Risk Detection for Hanraon Workspace
 * Detects deadline risks, blocked critical tasks, and overloaded assignees
 */
import { Task } from '../types';

export interface RiskAlert {
  taskId: string;
  taskTitle: string;
  type: 'DEADLINE_APPROACHING' | 'OVERDUE' | 'BLOCKED_CRITICAL' | 'ASSIGNEE_OVERLOAD';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
}

export function detectRisks(tasks: Task[]): RiskAlert[] {
  const risks: RiskAlert[] = [];
  const now = new Date();

  const assigneeTaskCount: Record<string, number> = {};

  for (const task of tasks) {
    if (task.status === '완료') continue;

    // Count active tasks per assignee
    if (task.assignee) {
      assigneeTaskCount[task.assignee] = (assigneeTaskCount[task.assignee] || 0) + 1;
    }

    if (!task.end_date) continue;
    const endDate = new Date(task.end_date);
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);

    // Overdue
    if (daysLeft < 0) {
      risks.push({
        taskId: task.id,
        taskTitle: task.title,
        type: 'OVERDUE',
        severity: 'HIGH',
        message: `"${task.title}" 마감일이 ${Math.abs(daysLeft)}일 초과되었습니다.`,
      });
    }
    // Approaching deadline (3 days)
    else if (daysLeft <= 3) {
      risks.push({
        taskId: task.id,
        taskTitle: task.title,
        type: 'DEADLINE_APPROACHING',
        severity: daysLeft <= 1 ? 'HIGH' : 'MEDIUM',
        message: `"${task.title}" 마감까지 ${daysLeft}일 남았습니다.`,
      });
    }

    // Critical path + blocked
    if (task.is_critical && task.status === '막힘') {
      risks.push({
        taskId: task.id,
        taskTitle: task.title,
        type: 'BLOCKED_CRITICAL',
        severity: 'HIGH',
        message: `임계 경로 태스크 "${task.title}"이(가) 막힘 상태입니다. 즉시 조치 필요.`,
      });
    }
  }

  // Assignee overload (5+ active tasks)
  for (const [assignee, count] of Object.entries(assigneeTaskCount)) {
    if (count >= 5) {
      risks.push({
        taskId: '',
        taskTitle: '',
        type: 'ASSIGNEE_OVERLOAD',
        severity: count >= 8 ? 'HIGH' : 'MEDIUM',
        message: `${assignee}님에게 미완료 태스크 ${count}건이 할당되어 있습니다.`,
      });
    }
  }

  return risks.sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
