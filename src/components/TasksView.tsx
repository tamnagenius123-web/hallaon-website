import React, { useState } from 'react';
import { Task } from '../types';
import { calculateCriticalPath } from '../lib/pert';
import { supabase } from '../lib/supabase';
import { getStatusColor } from './DashboardView';
import { sendDiscordNotification, formatTaskForDiscord } from '../lib/discord';
import { Plus, Pencil, Trash2, X, Check, AlertCircle, Send, RefreshCw } from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
}

const TEAM_OPTIONS = ['PM', 'CD', 'FS', 'DM', 'OPS'];
const STATUS_OPTIONS = ['시작 전', '대기', '진행 중', '작업 중', '막힘', '완료'];
const TEAM_COLORS: Record<string, string> = {
  PM: '#2383E2', CD: '#AE3EC9', FS: '#37B24D', DM: '#F76707', OPS: '#E67700'
};

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

export const TasksView = ({ tasks: initialTasks }: TasksViewProps) => {
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

  const tasks = calculateCriticalPath(initialTasks);

  const te = form.opt_time && form.prob_time && form.pess_time
    ? ((form.opt_time + 4 * form.prob_time + form.pess_time) / 6).toFixed(1)
    : '-';

  const filtered = tasks.filter(t => {
    if (!showDone && t.status === '완료') return false;
    if (filterStatus !== '전체' && t.status !== filterStatus) return false;
    if (filterTeam !== '전체' && !t.team?.includes(filterTeam)) return false;
    return true;
  });

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const teVal = form.opt_time && form.prob_time && form.pess_time
        ? (form.opt_time + 4 * form.prob_time + form.pess_time) / 6
        : 0;
      const payload = { ...form, exp_time: teVal, is_sent: false };
      if (editId) {
        const { error } = await supabase.from('tasks').update(payload).eq('id', editId);
        if (error) throw error;
        showNotification('업무가 수정되었습니다.');
      } else {
        const { error } = await supabase.from('tasks').insert([payload]);
        if (error) throw error;
        showNotification('새 업무가 추가되었습니다.');
      }
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
    } catch (err) {
      console.error('저장 실패:', err);
      showNotification('저장에 실패했습니다.', 'error');
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
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      showNotification('업무가 삭제되었습니다.');
    } catch (err) {
      console.error('삭제 실패:', err);
      showNotification('삭제에 실패했습니다.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await supabase.from('tasks').update({ status }).eq('id', id);
    } catch (err) { console.error('상태 변경 실패:', err); }
  };

  const handleDiscordSend = async (task: Task) => {
    setSending(task.id);
    try {
      const message = formatTaskForDiscord(task);
      const ok = await sendDiscordNotification(message);
      if (ok) {
        await supabase.from('tasks').update({ is_sent: true }).eq('id', task.id);
        setSentIds(p => new Set([...p, task.id]));
        showNotification(`"${task.title}" 디스코드 전송 완료!`);
      } else {
        showNotification('디스코드 전송 실패. Webhook URL을 확인하세요.', 'error');
      }
    } catch (err) {
      showNotification('전송 중 오류가 발생했습니다.', 'error');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 100,
          padding: '10px 16px', borderRadius: 8,
          background: notification.type === 'success' ? 'rgba(55,178,77,0.12)' : 'rgba(224,62,62,0.12)',
          border: `1px solid ${notification.type === 'success' ? 'rgba(55,178,77,0.3)' : 'rgba(224,62,62,0.3)'}`,
          color: notification.type === 'success' ? '#37B24D' : '#E03E3E',
          fontSize: 13, fontWeight: 500,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {notification.type === 'success' ? '✓ ' : '✕ '}{notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="notion-select" style={{ width: 120 }}>
            <option>전체</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="notion-select" style={{ width: 100 }}>
            <option>전체</option>
            {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--muted-foreground)', userSelect: 'none' }}>
            <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} style={{ cursor: 'pointer' }} />
            완료 표시
          </label>
        </div>
        <button
          className="notion-btn-primary"
          onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }}
        >
          <Plus size={15} />
          새 업무 추가
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{editId ? '업무 수정' : '새 업무 추가'}</h3>
              <button onClick={() => setShowForm(false)} className="notion-btn-ghost" style={{ padding: 6 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>업무명 *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="업무명을 입력하세요" className="notion-input" autoFocus />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>WBS 코드</label>
                <input value={form.wbs_code} onChange={e => setForm(p => ({ ...p, wbs_code: e.target.value }))} placeholder="예: 1.1.1" className="notion-input" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>선행 업무 WBS 코드</label>
                <input value={form.predecessor} onChange={e => setForm(p => ({ ...p, predecessor: e.target.value }))} placeholder="없으면 비워두세요" className="notion-input" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>담당자</label>
                <input value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} placeholder="담당자 이름" className="notion-input" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>팀</label>
                <select value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} className="notion-select">
                  {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>상태</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="notion-select">
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>시작일</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="notion-input" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>종료일</label>
                <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="notion-input" />
              </div>

              {/* PERT Section */}
              <div style={{ gridColumn: '1 / -1', background: 'var(--secondary)', borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📐 PERT 시간 예측
                  <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 400 }}>(단위: 일)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4, fontWeight: 600 }}>낙관적 (O)</label>
                    <input
                      type="number" min={0} step={0.5}
                      value={form.opt_time}
                      onChange={e => setForm(p => ({ ...p, opt_time: +e.target.value }))}
                      className="notion-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4, fontWeight: 600 }}>보통 (M)</label>
                    <input
                      type="number" min={0} step={0.5}
                      value={form.prob_time}
                      onChange={e => setForm(p => ({ ...p, prob_time: +e.target.value }))}
                      className="notion-input"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4, fontWeight: 600 }}>비관적 (P)</label>
                    <input
                      type="number" min={0} step={0.5}
                      value={form.pess_time}
                      onChange={e => setForm(p => ({ ...p, pess_time: +e.target.value }))}
                      className="notion-input"
                    />
                  </div>
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

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: '전체', value: tasks.length },
          { label: '진행 중', value: tasks.filter(t => ['진행 중','작업 중'].includes(t.status)).length },
          { label: '막힘', value: tasks.filter(t => t.status === '막힘').length },
          { label: '완료', value: tasks.filter(t => t.status === '완료').length },
        ].map((m, i) => (
          <div key={i} className="metric-card" style={{ padding: '14px 16px' }}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: '1.6rem' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="notion-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="notion-table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>WBS</th>
                <th>업무명</th>
                <th style={{ width: 80 }}>담당자</th>
                <th style={{ width: 60 }}>팀</th>
                <th style={{ width: 110 }}>상태</th>
                <th style={{ width: 65 }}>TE(일)</th>
                <th style={{ width: 65 }}>여유</th>
                <th style={{ width: 88 }}>시작일</th>
                <th style={{ width: 88 }}>종료일</th>
                <th style={{ width: 75 }}>선행</th>
                <th style={{ width: 90 }}></th>
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
                <tr key={task.id} style={{ background: task.is_critical ? 'rgba(224,62,62,0.02)' : undefined }}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                    {task.wbs_code || '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {task.is_critical && (
                        <div
                          style={{ width: 6, height: 6, borderRadius: '50%', background: '#E03E3E', flexShrink: 0 }}
                          title="핵심 경로 (Critical Path)"
                        />
                      )}
                      <span style={{ fontWeight: 500, fontSize: 13 }}>{task.title}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{task.assignee || '-'}</td>
                  <td>
                    {task.team && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: `${TEAM_COLORS[task.team] || '#868E96'}15`,
                        color: TEAM_COLORS[task.team] || '#868E96',
                        padding: '2px 6px', borderRadius: 4,
                      }}>{task.team}</span>
                    )}
                  </td>
                  <td>
                    <select
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                      style={{
                        fontSize: 11, fontWeight: 600, border: 'none', outline: 'none',
                        background: `${getStatusColor(task.status)}15`,
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
                  <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{task.start_date?.split('T')[0] || '-'}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{task.end_date?.split('T')[0] || '-'}</td>
                  <td style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'monospace' }}>{task.predecessor || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
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
                        {sending === task.id
                          ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Send size={12} />
                        }
                      </button>
                      <button
                        onClick={() => handleEdit(task)}
                        style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                        title="수정"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        disabled={deleting === task.id}
                        style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)' }}
                        title="삭제"
                      >
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

      {/* Critical path info */}
      {tasks.filter(t => t.is_critical).length > 0 && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 8,
          background: 'rgba(224,62,62,0.06)', border: '1px solid rgba(224,62,62,0.2)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
        }}>
          <AlertCircle size={14} color="#E03E3E" />
          <span>
            핵심 경로(Critical Path): <strong style={{ color: '#E03E3E' }}>
              {tasks.filter(t => t.is_critical).length}개
            </strong> 업무가 지연되면 전체 일정에 영향을 미칩니다.
          </span>
        </div>
      )}
    </div>
  );
};
