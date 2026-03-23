import React, { useState } from 'react';
import { Task } from '../types';
import { calculateCriticalPath } from '../lib/pert';

interface GanttViewProps {
  tasks: Task[];
}

const TEAM_COLORS: Record<string, string> = {
  PM: '#2383E2', CD: '#AE3EC9', FS: '#37B24D', DM: '#F76707', OPS: '#E67700'
};
const TEAM_OPTIONS = ['PM', 'CD', 'FS', 'DM', 'OPS'];

export const GanttView = ({ tasks: rawTasks }: GanttViewProps) => {
  const [hideCompleted, setHideCompleted] = useState(true);
  const [teamFilter, setTeamFilter] = useState('전체');

  const tasks = calculateCriticalPath(rawTasks);
  let filtered = tasks;
  if (hideCompleted) filtered = filtered.filter(t => t.status !== '완료');
  if (teamFilter !== '전체') filtered = filtered.filter(t => t.team?.includes(teamFilter));
  filtered = [...filtered].sort((a, b) => (a.wbs_code || '').localeCompare(b.wbs_code || ''));

  if (filtered.length === 0) {
    return (
      <div className="animate-fade-in notion-card p-8" style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
        표시할 업무가 없습니다. 필터를 변경하거나 업무를 추가해주세요.
      </div>
    );
  }

  // Build timeline
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = filtered.flatMap(t => [t.start_date, t.end_date].filter(Boolean)).map(d => new Date(d!));
  if (dates.length === 0) return <div className="notion-card p-6 text-muted-foreground text-center">날짜 데이터가 없습니다.</div>;

  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Start from Monday of minDate week
  const tlStart = new Date(minDate);
  tlStart.setDate(tlStart.getDate() - tlStart.getDay() + (tlStart.getDay() === 0 ? -6 : 1));
  tlStart.setHours(0,0,0,0);

  const tlEnd = new Date(maxDate);
  tlEnd.setDate(tlEnd.getDate() + 14);

  const totalDays = Math.ceil((tlEnd.getTime() - tlStart.getTime()) / 86400000);
  const weeks = Math.ceil(totalDays / 7);

  const pct = (date: Date) => ((date.getTime() - tlStart.getTime()) / (totalDays * 86400000)) * 100;

  const todayPct = pct(today);

  // Generate week labels
  const weekLabels: { label: string; offset: number }[] = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date(tlStart.getTime() + i * 7 * 86400000);
    weekLabels.push({ label: `${d.getMonth()+1}/${d.getDate()}`, offset: (i * 7 / totalDays) * 100 });
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--muted-foreground)' }}>
          <input type="checkbox" checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} />
          완료 숨기기
        </label>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="notion-select" style={{ width: 100, fontSize: 13 }}>
          <option>전체</option>
          {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {Object.entries(TEAM_COLORS).map(([team, color]) => (
            <div key={team} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted-foreground)' }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              {team}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted-foreground)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#E03E3E' }} />
            Critical
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--muted-foreground)' }}>
            <div style={{ width: 2, height: 12, background: 'var(--primary)' }} />
            오늘
          </div>
        </div>
      </div>

      {/* Gantt */}
      <div className="notion-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 1000, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--secondary)' }}>
                <th style={{ width: 70, padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'left', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>WBS</th>
                <th style={{ width: 160, padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'left', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>업무명</th>
                <th style={{ width: 60, padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'left', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>팀</th>
                <th style={{ width: 50, padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'left', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TE</th>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', textAlign: 'left', borderBottom: '1px solid var(--border)', position: 'relative', minWidth: 500 }}>
                  {/* Week markers */}
                  <div style={{ position: 'relative', height: 28, overflow: 'hidden' }}>
                    {weekLabels.map((wl, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${wl.offset}%`,
                          fontSize: 10,
                          color: 'var(--muted-foreground)',
                          fontWeight: 600,
                          transform: 'translateX(-50%)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {wl.label}
                      </div>
                    ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, idx) => {
                const startDate = task.start_date ? new Date(task.start_date) : null;
                const endDate = task.end_date ? new Date(task.end_date) : null;
                const teamColor = TEAM_COLORS[task.team?.split(',')[0]?.trim() || ''] || '#868E96';
                const barColor = task.is_critical ? '#E03E3E' : teamColor;

                let leftPct = 0, widthPct = 0;
                if (startDate && endDate) {
                  leftPct = Math.max(0, pct(startDate));
                  const endPct = Math.min(100, pct(new Date(endDate.getTime() + 86400000)));
                  widthPct = Math.max(0.5, endPct - leftPct);
                }

                return (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {task.wbs_code || '-'}
                    </td>
                    <td style={{ padding: '6px 10px', fontSize: 12, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.title}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {task.is_critical && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E03E3E', flexShrink: 0 }} />}
                        {task.title}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, background: `${teamColor}15`, color: teamColor, padding: '1px 5px', borderRadius: 3 }}>
                        {task.team?.split(',')[0]?.trim() || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 12 }}>{task.exp_time?.toFixed(1) ?? '-'}</td>
                    <td style={{ padding: '6px 4px', position: 'relative', height: 36 }}>
                      {/* Today marker */}
                      {todayPct >= 0 && todayPct <= 100 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${todayPct}%`,
                            top: 0, bottom: 0,
                            width: 1.5,
                            background: 'var(--primary)',
                            zIndex: 3,
                            opacity: 0.6,
                          }}
                        />
                      )}
                      {/* Grid lines */}
                      {weekLabels.map((wl, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${wl.offset}%`,
                            top: 0, bottom: 0,
                            width: 1,
                            background: 'var(--border)',
                            opacity: 0.5,
                          }}
                        />
                      ))}
                      {/* Bar */}
                      {startDate && endDate && (
                        <div
                          title={`${task.title}\n${task.start_date?.split('T')[0]} ~ ${task.end_date?.split('T')[0]}`}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            height: 20,
                            borderRadius: 3,
                            background: task.is_critical
                              ? 'linear-gradient(90deg, #E03E3E, #FF6B6B)'
                              : `${barColor}CC`,
                            boxShadow: task.is_critical ? `0 0 6px ${barColor}40` : undefined,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 5,
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            zIndex: 2,
                            cursor: 'pointer',
                            minWidth: 4,
                          }}
                        >
                          {widthPct > 4 ? task.title?.slice(0, 16) : ''}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
