/**
 * 조직 차트 상수 - 5개 팀 고정 (PM, CD, FS, DM, OPS)
 * 실제 조직도 반영 (2025-2026 한라온)
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

// 회장단 정보
export const COUNCIL_LEADERS = [
  { name: '장민성', role: '회장' },
  { name: '손서연', role: '부회장' },
  { name: '함지후', role: '부회장' },
];

// 팀별 멤버 — 실제 조직도 기반 (2025-2026 한라온)
export const TEAM_MEMBERS: Record<string, string[]> = {
  PM: ['박정서', '변준', '이다연', '이지은', '장민성', '손서연', '함지후'],
  FS: ['손채원', '조윤서'],
  DM: ['고명진', '김성윤'],
  CD: ['구하라', '김도윤', '김서현', '서은비', '최예나'],
  OPS: ['고민지', '김도현', '김수정', '이나영', '이은규'],
};

// 팀장 정보
export const TEAM_LEADERS: Record<string, string> = {
  PM: '함지후',
  FS: '손채원',
  DM: '고명진',
  CD: '김서현',
  OPS: '김도현',
};

// 전체 멤버 → 팀 매핑 (역방향 조회용)
const MEMBER_TO_TEAM: Record<string, string> = {};
for (const [team, members] of Object.entries(TEAM_MEMBERS)) {
  for (const member of members) {
    MEMBER_TO_TEAM[member] = team;
  }
}

/**
 * assignee 문자열을 개인 이름 배열로 확장
 * - 빈 값/공백만 있는 경우 → ['미정']
 * - 팀명(PM, CD, FS, DM, OPS)이면 해당 팀 전체 멤버로 확장
 * - 쉼표 구분 복수 담당자 지원 (e.g., "장민성, 손서연" → ['장민성', '손서연'])
 * - e.g., "OPS, 장민성" → ['고민지', '김도현', '김수정', '이나영', '이은규', '장민성']
 */
export function expandAssignees(assigneeStr: string): string[] {
  if (!assigneeStr || !assigneeStr.trim()) return ['미정'];
  const parts = assigneeStr.split(',').map(s => s.trim()).filter(Boolean);
  const names = new Set<string>();
  for (const part of parts) {
    if (TEAM_MEMBERS[part]) {
      // 팀명이면 해당 팀 멤버 전부 추가
      TEAM_MEMBERS[part].forEach(m => names.add(m));
    } else {
      names.add(part);
    }
  }
  return names.size > 0 ? Array.from(names) : ['미정'];
}

// 특정 이름이 속한 팀 반환
export function getTeamByMember(name: string): string | undefined {
  return MEMBER_TO_TEAM[name];
}

// 팀 색상 가져오기 (멤버 이름으로도 조회 가능)
export function getColorForPerson(nameOrTeam: string): string {
  if (TEAM_COLORS[nameOrTeam]) return TEAM_COLORS[nameOrTeam];
  const team = getTeamByMember(nameOrTeam);
  return team ? TEAM_COLORS[team] : '#868E96';
}
