import React, { useMemo } from 'react';
import { Task } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, Loader, TrendingUp, UserCheck, Users } from 'lucide-react';
import { expandAssignees } from '../lib/orgChart';
import { getWorkloadStats, getMostAvailableMembers } from '../lib/utils';

interface DashboardViewProps {
  tasks: Task[];
  agendas?: any[];
}

export const getStatusColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === '완료') return '#37B24D';
  if (s === 'in-progress' || s === '진행 중' || s === '작업 중') return '#2383E2';
  if (s === 'blocked' || s === '막힘') return '#E03E3E';
  if (s === 'pending' || s === '대기') return '#AE3EC9';
  if (s === 'not started' || s === '시작 전') return '#868E96';
  if (s === '보류') return '#F76707';
  return '#868E96';
};

const TEAM_COLORS: Record<string, string> = {
  PM: '#2383E2', CD: '#AE3EC9', FS: '#37B24D', DM: '#F76707', OPS: '#E67700'
};

const STATUS_COLORS_MAP: Record<string, string> = {
  '완료': '#37B24D', '막힘': '#E03E3E', '진행 중': '#2383E2',
  '작업 중': '#529CCA', '대기': '#AE3EC9', '시작 전': '#868E96', '보류': '#F76707',
};

const TEAM_OPTIONS = ['PM', 'CD', 'FS', 'DM', 'OPS'];

export const DashboardView = ({ tasks, agendas = [] }: DashboardViewProps) => {
  const today = new Date();

  // Workload Analysis
  const workloadStats = useMemo(() => getWorkloadStats(tasks), [tasks]);
  const availableMembers = useMemo(() => getMostAvailableMembers(tasks, 3), [tasks]);
  const busiestMembers = useMemo(() => [...workloadStats].reverse().slice(0, 3), [workloadStats]);
  const total = tasks.length;
  const inProgress = tasks.filter(t => ['진행 중', '작업 중'].includes(t.status)).length;
  const blocked = tasks.filter(t => t.status === '막힘').length;
  const done = tasks.filter(t => t.status === '완료').length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;

  // Deadline within 7 days
  const upcoming = tasks.filter(t => {
    if (t.status === '완료') return false;
    if (!t.end_date) return false;
    const days = Math.ceil((new Date(t.end_date).getTime() - today.getTime()) / 86400000);
    return days >= 0 && days <= 7;
  }).sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime());

  // Status distribution
  const statusData = Object.entries(
    tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: STATUS_COLORS_MAP[name] || '#868E96' }));

  // Assignee distribution (top 8) — 콤마 분리 + 팀명 → 멤버 확장
  const assigneeData = Object.entries(
    tasks.reduce((acc, t) => {
      // expandAssignees: 빈값→['미정'], 팀명→멤버 배열, 콤마 분리
      const names = expandAssignees(t.assignee || '');
      for (const name of names) {
        // '미정'은 집계에서 제외
        if (name !== '미정') acc[name] = (acc[name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

  // Team stats
  const teamStats = TEAM_OPTIONS.map(team => {
    const teamTasks = tasks.filter(t => t.team?.includes(team));
    const teamDone = teamTasks.filter(t => t.status === '완료').length;
    return {
      team,
      total: teamTasks.length,
      done: teamDone,
      pct: teamTasks.length > 0 ? Math.round(teamDone / teamTasks.length * 100) : 0,
      color: TEAM_COLORS[team] || '#868E96',
    };
  });

  const metrics = [
    { label: '전체 태스크', value: total, icon: <TrendingUp size={16} />, color: '#2383E2' },
    { label: '진행 중', value: inProgress, icon: <Loader size={16} />, color: '#2383E2' },
    { label: '막힘', value: blocked, icon: <AlertTriangle size={16} />, color: '#E03E3E' },
    { label: '완료', value: done, icon: <CheckCircle2 size={16} />, color: '#37B24D' },
  ];

  const customTooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--foreground)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  return (
    <div className="animate-fade-in space-y-5 md:space-y-6 px-4 py-6 md:py-8 max-w-[1200px] mx-auto">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div className="metric-label">{m.label}</div>
              <div style={{ color: m.color, opacity: 0.7 }}>{m.icon}</div>
            </div>
            <div className="metric-value" style={{ color: m.value > 0 && m.label === '막힘' ? '#E03E3E' : undefined }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Progress + Agendas */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        <div className="notion-card p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>프로젝트 완료율</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#37B24D' }}>{pct}%</div>
          </div>
          <div className="progress-bar" style={{ marginBottom: 14 }}>
            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: '#37B24D' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: '완료', value: done, color: '#37B24D' },
              { label: '진행 중', value: inProgress, color: '#2383E2' },
              { label: '막힘', value: blocked, color: '#E03E3E' },
              { label: '전체', value: total, color: 'var(--muted-foreground)' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Agenda summary */}
        <div className="notion-card p-5">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>🗂️ 안건 현황</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: '전체', value: agendas.length, color: 'var(--foreground)' },
              { label: '진행 중', value: agendas.filter((a: any) => a.status === '진행 중').length, color: '#2383E2' },
              { label: '시작 전', value: agendas.filter((a: any) => a.status === '시작 전').length, color: '#868E96' },
              { label: '완료', value: agendas.filter((a: any) => a.status === '완료').length, color: '#37B24D' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--muted-foreground)' }}>{s.label}</span>
                <span style={{ fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workload Analysis Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Available Members */}
        <div className="notion-card p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <UserCheck size={16} style={{ color: '#37B24D' }} />
            <div style={{ fontWeight: 600, fontSize: 14 }}>여유 있는 멤버</div>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 400 }}>업무 배정 추천</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {availableMembers.map((member, i) => (
              <div key={member.userName} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: i === 0 ? 'rgba(55,178,77,0.08)' : 'var(--secondary)', border: i === 0 ? '1px solid rgba(55,178,77,0.2)' : '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#37B24D' : 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {member.userName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {member.userName}
                    {i === 0 && <span style={{ fontSize: 10, color: '#37B24D', marginLeft: 6, fontWeight: 700 }}>BEST</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    진행 중 {member.taskCount}건 | 완료 {member.completedCount}건
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? '#37B24D' : 'var(--foreground)' }}>
                  {member.taskCount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Busiest Members */}
        <div className="notion-card p-5">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Users size={16} style={{ color: '#E03E3E' }} />
            <div style={{ fontWeight: 600, fontSize: 14 }}>업무 과부하 멤버</div>
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 400 }}>업무 분산 필요</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {busiestMembers.map((member, i) => (
              <div key={member.userName} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: i === 0 ? 'rgba(224,62,62,0.06)' : 'var(--secondary)', border: i === 0 ? '1px solid rgba(224,62,62,0.2)' : '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#E03E3E' : '#F76707', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {member.userName[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {member.userName}
                    {member.blockedCount > 0 && <span style={{ fontSize: 10, color: '#E03E3E', marginLeft: 6 }}>({member.blockedCount}건 막힘)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                    진행 중 {member.taskCount}건 | 완료 {member.completedCount}건
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? '#E03E3E' : 'var(--foreground)' }}>
                  {member.taskCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team breakdown */}
      <div className="notion-card p-5">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>팀별 업무 현황</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {teamStats.map(ts => (
            <div key={ts.team} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: ts.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{ts.team}</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 4 }}>{ts.total}</div>
              <div className="progress-bar" style={{ marginBottom: 4 }}>
                <div className="progress-bar-fill" style={{ width: `${ts.pct}%`, background: ts.color }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{ts.done}건 완료</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status pie */}
        <div className="notion-card p-5">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>상태별 분포</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="40%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Assignee bar */}
        <div className="notion-card p-5">
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>담당자별 태스크 (상위 8)</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assigneeData} layout="vertical" margin={{ left: 4, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} width={60} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Deadline upcoming */}
      <div className="notion-card p-5">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={15} style={{ color: '#F76707' }} />
          마감 임박 업무 (7일 이내)
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 400 }}>{upcoming.length}건</span>
        </div>
        {upcoming.length === 0 ? (
          <div style={{ color: 'var(--muted-foreground)', fontSize: 13, padding: '12px 0' }}>마감 임박 업무가 없습니다 🎉</div>
        ) : (
          <table className="notion-table">
            <thead>
              <tr>
                <th>WBS</th>
                <th>업무명</th>
                <th>담당자</th>
                <th>팀</th>
                <th>상태</th>
                <th>종료일</th>
                <th>D-Day</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map(t => {
                const days = Math.ceil((new Date(t.end_date).getTime() - today.getTime()) / 86400000);
                return (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)' }}>{t.wbs_code || '-'}</td>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td style={{ color: 'var(--muted-foreground)' }}>{t.assignee || '-'}</td>
                    <td>
                      <span style={{ fontSize: 11, background: `${TEAM_COLORS[t.team] || '#868E96'}20`, color: TEAM_COLORS[t.team] || '#868E96', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        {t.team || '-'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, background: `${getStatusColor(t.status)}15`, color: getStatusColor(t.status), padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{t.end_date?.split('T')[0]}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color: days <= 1 ? '#E03E3E' : days <= 3 ? '#F76707' : '#F59F00' }}>
                        D-{days}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
