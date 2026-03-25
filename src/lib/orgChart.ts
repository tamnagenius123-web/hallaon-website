/**
 * 조직 차트 상수 - 5개 팀 고정 (PM, CD, FS, DM, OPS)
 * 팀→멤버 확장 로직 포함
 */

export const TEAM_OPTIONS = ['PM', 'CD', 'FS', 'DM', 'OPS'] as const;
export type TeamOption = typeof TEAM_OPTIONS[number];

export const TEAM_COLORS: Record<string, string> = {
  PM: '#2383E2',
  CD: '#AE3EC9',
  FS: '#37B24D',
  DM: '#F76707',
  OPS: '#E67700',
};

export const TEAM_EMOJI: Record<string, string> = {
  PM: '📋',
  CD: '🎨',
  FS: '💻',
  DM: '📊',
  OPS: '⚙️',
};

// 팀별 멤버 (Supabase users 테이블 기반 — 이름이 DB와 일치해야 함)
// 실제 사용자가 추가되면 여기에 업데이트
export const TEAM_MEMBERS: Record<string, string[]> = {
  PM: ['김민준', '이서연'],
  CD: ['박지호', '최예린', '정우진'],
  FS: ['윤하은', '강도현'],
  DM: ['임채원', '한지민'],
  OPS: ['오승우', '신예지'],
};

// 팀 이름이거나 개인 이름인 assignee 문자열을 개인 이름 배열로 확장
// e.g., "OPS, 김민준" → ["오승우", "신예지", "김민준"]
export function expandAssignees(assigneeStr: string): string[] {
  if (!assigneeStr) return ['미배정'];
  const parts = assigneeStr.split(',').map(s => s.trim()).filter(Boolean);
  const names = new Set<string>();
  for (const part of parts) {
    if (TEAM_MEMBERS[part]) {
      TEAM_MEMBERS[part].forEach(m => names.add(m));
    } else {
      names.add(part);
    }
  }
  return names.size > 0 ? Array.from(names) : ['미배정'];
}

// 특정 이름이 속한 팀 반환
export function getTeamByMember(name: string): string | undefined {
  for (const [team, members] of Object.entries(TEAM_MEMBERS)) {
    if (members.includes(name)) return team;
  }
  return undefined;
}

// 팀 색상 가져오기 (멤버 이름으로도 조회 가능)
export function getColorForPerson(nameOrTeam: string): string {
  if (TEAM_COLORS[nameOrTeam]) return TEAM_COLORS[nameOrTeam];
  const team = getTeamByMember(nameOrTeam);
  return team ? TEAM_COLORS[team] : '#888888';
}
