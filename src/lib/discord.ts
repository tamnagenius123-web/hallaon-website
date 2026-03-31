/**
 * Discord Webhook Utility
 * Sends notifications to Discord via server API
 */

export const sendDiscordNotification = async (message: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/notifications/discord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return response.ok;
  } catch (err) {
    console.error('Discord 전송 실패:', err);
    return false;
  }
};

export const formatTaskForDiscord = (task: {
  wbs_code?: string;
  title: string;
  assignee?: string;
  team?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  exp_time?: number;
  opt_time?: number;
  prob_time?: number;
  pess_time?: number;
  predecessor?: string;
  content?: string;
}) => {
  const statusEmoji: Record<string, string> = {
    '완료': '✅', '진행 중': '🔵', '작업 중': '🔵', '막힘': '🔴',
    '대기': '🟣', '시작 전': '⚪', '보류': '🟠',
  };
  const emoji = statusEmoji[task.status] || '⚪';
  
  const lines = [
    `**📋 [업무 전송] ${task.title}**`,
    `> WBS: \`${task.wbs_code || '-'}\` | 담당: ${task.assignee || '-'} | 팀: ${task.team || '-'}`,
    `> 상태: ${emoji} ${task.status} | 기간: ${task.start_date || '-'} ~ ${task.end_date || '-'}`,
  ];

  if (task.exp_time !== undefined) {
    lines.push(`> 기대시간(TE): **${task.exp_time.toFixed(1)}일**`);
  }

  if (task.opt_time !== undefined && task.prob_time !== undefined && task.pess_time !== undefined) {
    lines.push(`> PERT: 낙관 ${task.opt_time}일 | 기대 ${task.prob_time}일 | 비관 ${task.pess_time}일`);
  }

  if (task.predecessor) {
    lines.push(`> 선행업무: ${task.predecessor}`);
  }

  if (task.content) {
    const contentPreview = task.content
      .substring(0, 200)
      .replace(/[*_`~]/g, '')
      .trim();
    if (contentPreview) {
      lines.push(`> 상세내용: ${contentPreview}...`);
    }
  }

  return lines.join('\n');
};

export const formatAgendaForDiscord = (agenda: {
  title: string;
  proposer?: string;
  team?: string;
  status: string;
  proposed_date?: string;
  content?: string;
}) => {
  const statusEmoji: Record<string, string> = {
    '완료': '✅', '진행 중': '🔵', '막힘': '🔴',
    '대기': '🟣', '시작 전': '⚪', '보류': '🟠',
  };
  const emoji = statusEmoji[agenda.status] || '⚪';
  
  const lines = [
    `**🗂️ [안건 전송] ${agenda.title}**`,
    `> 입안자: ${agenda.proposer || '-'} | 팀: ${agenda.team || '-'}`,
    `> 상태: ${emoji} ${agenda.status} | 입안일: ${agenda.proposed_date || '-'}`,
  ];

  if (agenda.content) {
    const contentPreview = agenda.content
      .substring(0, 200)
      .replace(/[*_`~]/g, '')
      .trim();
    if (contentPreview) {
      lines.push(`> 상세내용: ${contentPreview}...`);
    }
  }

  return lines.join('\n');
};
