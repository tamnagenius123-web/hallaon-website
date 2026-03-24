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
}) => {
  const statusEmoji: Record<string, string> = {
    '완료': '✅', '진행 중': '🔵', '작업 중': '🔵', '막힘': '🔴',
    '대기': '🟣', '시작 전': '⚪', '보류': '🟠',
  };
  const emoji = statusEmoji[task.status] || '⚪';
  
  return [
    `**📋 [업무 전송] ${task.title}**`,
    `> WBS: \`${task.wbs_code || '-'}\` | 담당: ${task.assignee || '-'} | 팀: ${task.team || '-'}`,
    `> 상태: ${emoji} ${task.status} | 기간: ${task.start_date || '-'} ~ ${task.end_date || '-'}`,
    task.exp_time !== undefined ? `> 기대시간(TE): **${task.exp_time.toFixed(1)}일**` : '',
  ].filter(Boolean).join('\n');
};

export const formatAgendaForDiscord = (agenda: {
  title: string;
  proposer?: string;
  team?: string;
  status: string;
  proposed_date?: string;
}) => {
  const statusEmoji: Record<string, string> = {
    '완료': '✅', '진행 중': '🔵', '막힘': '🔴',
    '대기': '🟣', '시작 전': '⚪', '보류': '🟠',
  };
  const emoji = statusEmoji[agenda.status] || '⚪';
  
  return [
    `**🗂️ [안건 전송] ${agenda.title}**`,
    `> 입안자: ${agenda.proposer || '-'} | 팀: ${agenda.team || '-'}`,
    `> 상태: ${emoji} ${agenda.status} | 입안일: ${agenda.proposed_date || '-'}`,
  ].join('\n');
};
