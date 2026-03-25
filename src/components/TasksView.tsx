import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { calculateCriticalPath } from '../lib/pert';
import { supabase } from '../lib/supabase';
import { getStatusColor } from './DashboardView';
import { sendDiscordNotification, formatTaskForDiscord } from '../lib/discord';
import { useAppContext } from '../App';
import { TEAM_OPTIONS as ORG_TEAMS, TEAM_COLORS as ORG_COLORS, expandAssignees, getColorForPerson } from '../lib/orgChart';
import {
  Plus, Pencil, Trash2, X, Check, AlertCircle, Send, RefreshCw,
  ChevronDown, User, BarChart2, Table, ArrowRightLeft, Clock, Layers
} from 'lucide-react';

export const TEAM_OPTIONS = ORG_TEAMS as unknown as string[];
export const STATUS_OPTIONS = ['시작 전', '대기', '진행 중', '작업 중', '막힘', '완료'];
export const TEAM_COLORS: Record<string, string> = ORG_COLORS;

interface TaskFormData {
  title: string;
  assignee: string;
  team: string;
  status: string;
  wbs_code: string;
  predecessor: string;
  opt_time: number;
  prob_time: number;
  pess_time: number;
  start_date: string;
  end_date: string;
}

const defaultForm: TaskFormData = {
  title: '', assignee: '', team: 'PM', status: '시작 전',
  wbs_code: '', predecessor: '',
  opt_time: 1, prob_time: 3, pess_time: 7,
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
};

// 선행업무 연쇄 이동 계산 (MS Project 스타일)
function cascadeSchedule(tasks: Task[], changedId: string, newEndDate: string): Map<string, { start_date: string; end_date: string }> {
  const updates = new Map<string, { start_date: string; end_date: string }>();
  const taskMap = new Map(tasks.map(t => [t.wbs_code, t]));
  
  // BFS로 의존 관계 타고 연쇄 업데이트
  const changed = tasks.find(t => t.id === changedId);
  if (!changed) return updates;
  
  const queue: string[] = [changed.wbs_code];
  const visited = new Set<string>();
  
  // 먼저 changed task의 새 종료일 설정
  const changedTask = tasks.find(t => t.id === changedId);
  if (!changedTask) return updates;
  
  const endDateMap = new Map<string, string>();
  endDateMap.set(changed.wbs_code, newEndDate);

  while (queue.length > 0) {
    const currentWbs = queue.shift()!;
    if (visited.has(currentWbs)) continue;
    visited.add(currentWbs);

    // 이 업무를 선행으로 가진 업무 찾기
    const successors = tasks.filter(t => 
      t.predecessor && t.predecessor.split(',').map(s => s.trim()).includes(currentWbs)
    );

    for (const succ of successors) {
      if (visited.has(succ.wbs_code)) continue;
      
      // 선행 업무들의 최대 종료일 찾기
      const predecessorWbsCodes = succ.predecessor!.split(',').map(s => s.trim());
      let maxPredEndDate = '';
      for (const predWbs of predecessorWbsCodes) {
        const predEndDate = endDateMap.get(predWbs) || taskMap.get(predWbs)?.end_date || '';
        if (predEndDate > maxPredEndDate) maxPredEndDate = predEndDate;
      }

      if (!maxPredEndDate) continue;

      // 후속 업무의 새 시작일 = 선행 최대 종료일 + 1일
      const predEnd = new Date(maxPredEndDate);
      predEnd.setDate(predEnd.getDate() + 1);
      const newStart = predEnd.toISOString().split('T')[0];

      // 기존 기간 유지하며 날짜 이동
      const origTask = taskMap.get(succ.wbs_code);
      if (!origTask) continue;
      const origStart = new Date(origTask.start_date || newStart);
      const origEnd = new Date(origTask.end_date || newStart);
      const duration = Math.max(0, Math.ceil((origEnd.getTime() - origStart.getTime()) / 86400000));
      
      const newStartDate = newStart;
      const newEndDt = new Date(newStart);
      newEndDt.setDate(newEndDt.getDate() + duration);
      const newEndDateStr = newEndDt.toISOString().split('T')[0];

      updates.set(succ.id, { start_date: newStartDate, end_date: newEndDateStr });
      endDateMap.set(succ.wbs_code, newEndDateStr);
      queue.push(succ.wbs_code);
    }
  }
  
  return updates;
}

interface TasksViewProps {
  tasks: Task[];
}

type ViewMode = 'table' | 'workload';

export const TasksView = ({ tasks: initialTasks }: TasksViewProps) => {
  const { optimisticUpdateTask, optimisticAddTask, optimisticDeleteTask } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterTeam, setFilterTeam] = useState('전체');
  const [showDone, setShowDone] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [cascadeModal, setCascadeModal] = useState<{ taskId: string; updates: Map<string, any> } | null>(null);

  const tasks = useMemo(() => calculateCriticalPath(initialTasks), [initialTasks]);

  const te = form.opt_time && form.prob_time && form.pess_time
    ? ((form.opt_time + 4 * form.prob_time + form.pess_time) / 6).toFixed(1)
    : '-';

  const filtered = useMemo(() => tasks.filter(t => {
    if (!showDone && t.status === '완료') return false;
    if (filterStatus !== '전체' && t.status !== filterStatus) return false;
    if (filterTeam !== '전체' && !t.team?.includes(filterTeam)) return false;
    return true;
  }), [tasks, showDone, filterStatus, filterTeam]);

  // 담당자별 부하 계산 — 팀명은 멤버로 확장, 쉼표 구분 복수 담당자 지원
  const workloadData = useMemo(() => {
    const map: Record<string, { total: number; active: number; blocked: number; done: number; te: number; tasks: Task[] }> = {};
    for (const t of tasks) {
      // assignee 콤마 분리 → 팀명이면 멤버로 확장
      const names = expandAssignees(t.assignee || '');
      for (const name of names) {
        if (!map[name]) map[name] = { total: 0, active: 0, blocked: 0, done: 0, te: 0, tasks: [] };
        map[name].total++;
        map[name].te += t.exp_time || 0;
        // 같은 task가 이미 추가되지 않았을 때만 push
        if (!map[name].tasks.find(x => x.id === t.id)) map[name].tasks.push(t);
        if (t.status === '완료') map[name].done++;
        else if (t.status === '막힘') map[name].blocked++;
        else if (['진행 중', '작업 중'].includes(t.status)) map[name].active++;
      }
    }
    return Object.entries(map).sort((a, b) => b[1].active - a[1].active);
  }, [tasks]);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const teVal = form.opt_time && form.prob_time && form.pess_time
      ? (form.opt_time + 4 * form.prob_time + form.pess_time) / 6
      : 0;
    const payload = { ...form, exp_time: teVal, is_sent: false };
    
    try {
      if (editId) {
        // Optimistic update
        optimisticUpdateTask(editId, payload);
        const { error } = await supabase.from('tasks').update(payload).eq('id', editId);
        if (error) {
          // Rollback
          optimisticUpdateTask(editId, initialTasks.find(t => t.id === editId) || {});
          throw error;
        }
        showNotification('업무가 수정되었습니다.');
      } else {
        const tempId = `temp-${Date.now()}`;
        const newTask = { id: tempId, ...payload, created_at: new Date().toISOString() } as Task;
        optimisticAddTask(newTask);
        const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
        if (error) {
          optimisticDeleteTask(tempId);
          throw error;
        }
        optimisticDeleteTask(tempId);
        if (data) optimisticAddTask(data);
        showNotification('새 업무가 추가되었습니다.');
      }
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
    } catch (err: any) {
      showNotification(err.message || '저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (task: Task) => {
    setForm({
      title: task.title || '',
      assignee: task.assignee || '',
      team: task.team || 'PM',
      status: task.status || '시작 전',
      wbs_code: task.wbs_code || '',
      predecessor: task.predecessor || '',
      opt_time: task.opt_time || 1,
      prob_time: task.prob_time || 3,
      pess_time: task.pess_time || 7,
      start_date: task.start_date ? task.start_date.split('T')[0] : defaultForm.start_date,
      end_date: task.end_date ? task.end_date.split('T')[0] : defaultForm.end_date,
    });
    setEditId(task.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 업무를 삭제하시겠습니까?')) return;
    setDeleting(id);
    optimisticDeleteTask(id);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      showNotification('업무가 삭제되었습니다.');
    } catch (err: any) {
      showNotification('삭제에 실패했습니다.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    optimisticUpdateTask(id, { status });
    try {
      await supabase.from('tasks').update({ status }).eq('id', id);
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  // 날짜 변경 시 선행업무 연쇄 업데이트 (MS Project 스타일)
  const handleDateChange = async (id: string, field: 'start_date' | 'end_date', value: string) => {
    optimisticUpdateTask(id, { [field]: value });
    await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    
    // 종료일 변경 시 후속업무 연쇄 계산
    if (field === 'end_date') {
      const cascadeUpdates = cascadeSchedule(tasks, id, value);
      if (cascadeUpdates.size > 0) {
        setCascadeModal({ taskId: id, updates: cascadeUpdates });
      }
    }
  };

  const applyCascadeUpdates = async () => {
    if (!cascadeModal) return;
    const { updates } = cascadeModal;
    for (const [taskId, patch] of updates) {
      optimisticUpdateTask(taskId, patch);
      await supabase.from('tasks').update(patch).eq('id', taskId);
    }
    setCascadeModal(null);
    showNotification(`${updates.size}개 업무 일정이 연쇄 업데이트되었습니다.`);
  };

  const handleDiscordSend = async (task: Task) => {
    setSending(task.id);
    try {
      const message = formatTaskForDiscord(task);
      const ok = await sendDiscordNotification(message);
      if (ok) {
        await supabase.from('tasks').update({ is_sent: true }).eq('id', task.id);
        optimisticUpdateTask(task.id, { is_sent: true });
        setSentIds(p => new Set([...p, task.id]));
        showNotification(`"${task.title}" 디스코드 전송 완료!`);
      } else {
        showNotification('디스코드 전송 실패.', 'error');
      }
    } catch {
      showNotification('전송 중 오류가 발생했습니다.', 'error');
    } finally {
      setSending(null);
    }
  };

  const criticalCount = tasks.filter(t => t.is_critical).length;

  return (
    <div className="animate-fade-in">
      {/* Toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          padding: '10px 18px', borderRadius: 8,
          background: notification.type === 'success' ? 'rgba(55,178,77,0.12)' : 'rgba(224,62,62,0.12)',
          border: `1px solid ${notification.type === 'success' ? 'rgba(55,178,77,0.3)' : 'rgba(224,62,62,0.3)'}`,
          color: notification.type === 'success' ? '#37B24D' : '#E03E3E',
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {notification.type === 'success' ? '✓' : '✕'} {notification.msg}
        </div>
      )}

      {/* Cascade Modal */}
      {cascadeModal && (
        <div className="modal-overlay" onClick={() => setCascadeModal(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <ArrowRightLeft size={18} color="#F76707" />
              <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>선행업무 연쇄 일정 업데이트</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>
              이 업무의 종료일 변경으로 인해 <strong style={{ color: 'var(--foreground)' }}>{cascadeModal.updates.size}개</strong> 후속 업무의 일정이 자동 조정됩니다.
            </p>
            <div style={{ background: 'var(--secondary)', borderRadius: 8, padding: 12, marginBottom: 16, maxHeight: 200, overflow: 'auto' }}>
              {Array.from(cascadeModal.updates.entries()).map(([taskId, patch]) => {
                const t = tasks.find(x => x.id === taskId);
                return (
                  <div key={taskId} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{t?.title || taskId}</span>
                    <span style={{ color: 'var(--muted-foreground)' }}>{patch.start_date} ~ {patch.end_date}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCascadeModal(null)} className="notion-btn-secondary">무시</button>
              <button onClick={applyCascadeUpdates} className="notion-btn-primary">
                <Check size={14} /> 연쇄 업데이트 적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="notion-select" style={{ width: 120 }}>
            <option>전체</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="notion-select" style={{ width: 100 }}>
            <option>전체</option>
            {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--muted-foreground)', userSelect: 'none' }}>
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} />
            완료 표시
          </label>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--secondary)', borderRadius: 6, padding: 2 }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12,
                background: viewMode === 'table' ? 'var(--card)' : 'transparent',
                color: viewMode === 'table' ? 'var(--foreground)' : 'var(--muted-foreground)',
                display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
              }}
            ><Table size={13} />테이블</button>
            <button
              onClick={() => setViewMode('workload')}
              style={{
                padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 12,
                background: viewMode === 'workload' ? 'var(--card)' : 'transparent',
                color: viewMode === 'workload' ? 'var(--foreground)' : 'var(--muted-foreground)',
                display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
              }}
            ><BarChart2 size={13} />부하 뷰</button>
          </div>
        </div>
        <button
          className="notion-btn-primary"
          onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }}
        >
          <Plus size={15} /> 새 업무 추가
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-container" style={{ maxWidth: 580 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{editId ? '✏️ 업무 수정' : '➕ 새 업무 추가'}</h3>
              <button onClick={() => setShowForm(false)} className="notion-btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="notion-property-label">업무명 *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="업무명을 입력하세요" className="notion-input" autoFocus />
              </div>
              <div>
                <label className="notion-property-label">WBS 코드</label>
                <input value={form.wbs_code} onChange={e => setForm(p => ({ ...p, wbs_code: e.target.value }))} placeholder="예: 1.1.1" className="notion-input" />
              </div>
              <div>
                <label className="notion-property-label">선행 업무 WBS (복수: 쉼표 구분)</label>
                <input value={form.predecessor} onChange={e => setForm(p => ({ ...p, predecessor: e.target.value }))} placeholder="예: 1.1, 1.2" className="notion-input" />
              </div>
              <div>
                <label className="notion-property-label">담당자</label>
                <input value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} placeholder="담당자 이름" className="notion-input" />
              </div>
              <div>
                <label className="notion-property-label">팀</label>
                <select value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} className="notion-select" style={{ width: '100%' }}>
                  {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="notion-property-label">상태</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="notion-select" style={{ width: '100%' }}>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="notion-property-label">시작일</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="notion-input" />
              </div>
              <div>
                <label className="notion-property-label">종료일</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="notion-input" />
              </div>

              {/* PERT Section */}
              <div style={{ gridColumn: '1 / -1', background: 'var(--secondary)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> PERT 시간 예측
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 400 }}>(단위: 일)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { label: '낙관적 (O)', key: 'opt_time' },
                    { label: '보통 (M)', key: 'prob_time' },
                    { label: '비관적 (P)', key: 'pess_time' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4, fontWeight: 600 }}>{label}</label>
                      <input
                        type="number" min={0} step={0.5}
                        value={(form as any)[key]}
                        onChange={e => setForm(p => ({ ...p, [key]: +e.target.value }))}
                        className="notion-input"
                      />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--card)', borderRadius: 6, fontSize: 13 }}>
                  기대 시간(TE) = (O + 4M + P) / 6 = <strong style={{ color: 'var(--primary)', fontSize: 15 }}>{te}일</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="notion-btn-secondary">취소</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="notion-btn-primary" style={{ minWidth: 80 }}>
                {saving ? '저장 중...' : <><Check size={14} /> 저장</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: '전체', value: tasks.length, color: 'var(--primary)' },
          { label: '진행 중', value: tasks.filter(t => ['진행 중','작업 중'].includes(t.status)).length, color: '#37B24D' },
          { label: '막힘', value: tasks.filter(t => t.status === '막힘').length, color: '#E03E3E' },
          { label: '완료', value: tasks.filter(t => t.status === '완료').length, color: '#868E96' },
          { label: '핵심경로', value: criticalCount, color: '#F76707' },
        ].map((m, i) => (
          <div key={i} className="metric-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: m.value > 0 && (m.label === '막힘' || m.label === '핵심경로') ? m.color : 'var(--foreground)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Workload View */}
      {viewMode === 'workload' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={15} color="var(--muted-foreground)" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>담당자별 업무 부하</span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>— 업무량이 많은 순</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {workloadData.map(([name, data]) => {
              const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
              const teTotal = data.te.toFixed(1);
              const personColor = getColorForPerson(name);
              return (
                <div key={name} className="notion-card" style={{ padding: 16, borderTop: `3px solid ${personColor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: personColor, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                      }}>{name[0]}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>총 {teTotal}일 공수</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: pct === 100 ? '#37B24D' : 'var(--foreground)' }}>{pct}%</div>
                  </div>
                  
                  {/* Progress bar */}
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#37B24D' : personColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: '진행', value: data.active, color: '#37B24D' },
                      { label: '막힘', value: data.blocked, color: '#E03E3E' },
                      { label: '완료', value: data.done, color: '#868E96' },
                      { label: '전체', value: data.total, color: 'var(--muted-foreground)' },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', background: 'var(--secondary)', borderRadius: 6 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: s.value > 0 && s.label === '막힘' ? s.color : 'var(--foreground)' }}>{s.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Task list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {data.tasks.filter(t => t.status !== '완료').slice(0, 4).map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--secondary)', borderRadius: 5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: getStatusColor(t.status), flexShrink: 0 }} />
                        <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                        {t.is_critical && <span style={{ fontSize: 9, color: '#E03E3E', fontWeight: 700, background: 'rgba(224,62,62,0.1)', padding: '1px 4px', borderRadius: 3 }}>CP</span>}
                      </div>
                    ))}
                    {data.tasks.filter(t => t.status !== '완료').length > 4 && (
                      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', textAlign: 'center', padding: '4px 0' }}>
                        +{data.tasks.filter(t => t.status !== '완료').length - 4}개 더
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="notion-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="notion-table" style={{ minWidth: 1050 }}>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>WBS</th>
                  <th>업무명</th>
                  <th style={{ width: 80 }}>담당자</th>
                  <th style={{ width: 60 }}>팀</th>
                  <th style={{ width: 115 }}>상태</th>
                  <th style={{ width: 62 }}>TE(일)</th>
                  <th style={{ width: 62 }}>여유</th>
                  <th style={{ width: 110 }}>시작일</th>
                  <th style={{ width: 110 }}>종료일</th>
                  <th style={{ width: 75 }}>선행</th>
                  <th style={{ width: 88 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--muted-foreground)', fontSize: 13 }}>
                      등록된 업무가 없습니다
                    </td>
                  </tr>
                ) : filtered.map(task => (
                  <tr key={task.id} style={{
                    background: task.is_critical ? 'rgba(224,62,62,0.02)' : undefined,
                    borderLeft: task.is_critical ? '2px solid rgba(224,62,62,0.4)' : '2px solid transparent',
                    transition: 'background 0.15s',
                  }}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                      {task.wbs_code || '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {task.is_critical && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#E03E3E', flexShrink: 0 }} title="핵심 경로" />
                        )}
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{task.title}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{task.assignee || '-'}</td>
                    <td>
                      {task.team && (
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: `${TEAM_COLORS[task.team] || '#868E96'}20`,
                          color: TEAM_COLORS[task.team] || '#868E96',
                          padding: '2px 7px', borderRadius: 4,
                        }}>{task.team}</span>
                      )}
                    </td>
                    <td>
                      <select
                        value={task.status}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                        style={{
                          fontSize: 11, fontWeight: 600, border: 'none', outline: 'none',
                          background: `${getStatusColor(task.status)}18`,
                          color: getStatusColor(task.status),
                          padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {task.exp_time !== undefined ? task.exp_time.toFixed(1) : '-'}
                    </td>
                    <td style={{
                      fontFamily: 'monospace', fontSize: 12,
                      color: task.is_critical ? '#E03E3E' : 'var(--muted-foreground)',
                      fontWeight: task.is_critical ? 700 : 400,
                    }}>
                      {task.slack !== undefined ? task.slack.toFixed(1) : '-'}
                    </td>
                    {/* 인라인 날짜 편집 */}
                    <td>
                      <input
                        type="date"
                        value={task.start_date?.split('T')[0] || ''}
                        onChange={e => handleDateChange(task.id, 'start_date', e.target.value)}
                        style={{
                          fontSize: 11, border: 'none', background: 'transparent',
                          color: 'var(--muted-foreground)', cursor: 'pointer',
                          fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={task.end_date?.split('T')[0] || ''}
                        onChange={e => handleDateChange(task.id, 'end_date', e.target.value)}
                        style={{
                          fontSize: 11, border: 'none', background: 'transparent',
                          color: 'var(--muted-foreground)', cursor: 'pointer',
                          fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{task.predecessor || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <button
                          onClick={() => handleDiscordSend(task)}
                          disabled={sending === task.id}
                          style={{
                            padding: 5, borderRadius: 5, border: 'none',
                            background: 'transparent', cursor: 'pointer',
                            color: sentIds.has(task.id) || task.is_sent ? '#37B24D' : 'var(--muted-foreground)',
                          }}
                          title="디스코드 전송"
                        >
                          {sending === task.id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
                        </button>
                        <button onClick={() => handleEdit(task)} style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)' }} title="수정">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(task.id)} disabled={deleting === task.id} style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)' }} title="삭제">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Critical Path Banner */}
      {criticalCount > 0 && viewMode === 'table' && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(224,62,62,0.06)', border: '1px solid rgba(224,62,62,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        }}>
          <AlertCircle size={14} color="#E03E3E" />
          <span>
            핵심 경로(Critical Path): <strong style={{ color: '#E03E3E' }}>{criticalCount}개</strong> 업무가 지연되면 전체 일정에 영향을 미칩니다.
          </span>
        </div>
      )}
    </div>
  );
};
