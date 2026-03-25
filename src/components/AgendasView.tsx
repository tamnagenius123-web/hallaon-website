import React, { useState } from 'react';
import { Agenda } from '../types';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Plus, CheckCircle2, Clock, User, Tag, Calendar, Trash2, Pencil, X, Check, Search, Send, RefreshCw } from 'lucide-react';
import { getStatusColor } from './DashboardView';
import { sendDiscordNotification, formatAgendaForDiscord } from '../lib/discord';
import { useAppContext } from '../App';
import { TEAM_OPTIONS as ORG_TEAMS, TEAM_COLORS as ORG_COLORS } from '../lib/orgChart';

interface AgendasViewProps {
  agendas: Agenda[];
}

const TEAM_OPTIONS = ORG_TEAMS as unknown as string[];
const STATUS_OPTIONS = ['시작 전', '진행 중', '완료', '보류'];
const TEAM_COLORS: Record<string, string> = ORG_COLORS;

interface AgendaForm {
  title: string;
  proposer: string;
  team: string;
  status: string;
  proposed_date: string;
}

const defaultForm: AgendaForm = {
  title: '', proposer: '', team: 'PM', status: '시작 전',
  proposed_date: new Date().toISOString().split('T')[0],
};

export const AgendasView = ({ agendas }: AgendasViewProps) => {
  const { optimisticUpdateAgenda, optimisticAddAgenda, optimisticDeleteAgenda } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AgendaForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterTeam, setFilterTeam] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = agendas.filter(a => {
    if (filterStatus !== '전체' && a.status !== filterStatus) return false;
    if (filterTeam !== '전체' && !a.team?.includes(filterTeam)) return false;
    if (searchQuery && !a.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.proposed_date).getTime() - new Date(a.proposed_date).getTime());

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        optimisticUpdateAgenda(editId, form);
        const { error } = await supabase.from('agendas').update(form).eq('id', editId);
        if (error) throw error;
        showToast('안건이 수정되었습니다.');
      } else {
        const tempId = `temp-${Date.now()}`;
        const newAgenda = { id: tempId, ...form, is_sent: false } as Agenda;
        optimisticAddAgenda(newAgenda);
        const { data, error } = await supabase.from('agendas').insert([{ ...form, is_sent: false }]).select().single();
        if (error) {
          optimisticDeleteAgenda(tempId);
          throw error;
        }
        optimisticDeleteAgenda(tempId);
        if (data) optimisticAddAgenda(data);
        showToast('새 안건이 등록되었습니다.');
      }
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
    } catch (err) {
      console.error('저장 실패:', err);
      showToast('저장에 실패했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (agenda: Agenda) => {
    setForm({
      title: agenda.title || '',
      proposer: agenda.proposer || '',
      team: agenda.team || 'PM',
      status: agenda.status || '시작 전',
      proposed_date: agenda.proposed_date?.split('T')[0] || defaultForm.proposed_date,
    });
    setEditId(agenda.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 안건을 삭제하시겠습니까?')) return;
    setDeleting(id);
    optimisticDeleteAgenda(id);
    try {
      const { error } = await supabase.from('agendas').delete().eq('id', id);
      if (error) throw error;
      showToast('안건이 삭제되었습니다.');
    } catch (err) {
      showToast('삭제에 실패했습니다.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    optimisticUpdateAgenda(id, { status });
    try {
      await supabase.from('agendas').update({ status }).eq('id', id);
    } catch (err) { console.error('상태 변경 실패:', err); }
  };

  const handleDiscordSend = async (agenda: Agenda) => {
    setSending(agenda.id);
    try {
      const message = formatAgendaForDiscord(agenda);
      const ok = await sendDiscordNotification(message);
      if (ok) {
        await supabase.from('agendas').update({ is_sent: true }).eq('id', agenda.id);
        setSentIds(p => new Set([...p, agenda.id]));
        showToast(`"${agenda.title}" 디스코드 전송 완료!`);
      } else {
        showToast('디스코드 전송 실패. Webhook URL을 확인하세요.', 'error');
      }
    } catch (err) {
      showToast('전송 중 오류가 발생했습니다.', 'error');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Toast */}
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

      {/* Top controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="안건명으로 검색..."
            className="notion-input"
            style={{ paddingLeft: 30 }}
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="notion-select" style={{ width: 110 }}>
          <option>전체</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="notion-select" style={{ width: 100 }}>
          <option>전체</option>
          {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* View mode toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {(['card', 'table'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: '5px 10px', fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500,
                background: viewMode === mode ? 'var(--primary)' : 'transparent',
                color: viewMode === mode ? '#fff' : 'var(--muted-foreground)',
              }}
            >
              {mode === 'card' ? '카드' : '목록'}
            </button>
          ))}
        </div>

        <button className="notion-btn-primary" onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }}>
          <Plus size={15} /> 새 안건
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: '전체', value: agendas.length },
          { label: '진행 중', value: agendas.filter(a => a.status === '진행 중').length },
          { label: '보류', value: agendas.filter(a => a.status === '보류').length },
          { label: '완료', value: agendas.filter(a => a.status === '완료').length },
        ].map((m, i) => (
          <div key={i} className="metric-card" style={{ padding: '12px 16px' }}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ fontSize: '1.5rem' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{editId ? '안건 수정' : '새 안건 제안'}</h3>
              <button onClick={() => setShowForm(false)} className="notion-btn-ghost" style={{ padding: 5 }}><X size={16} /></button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>안건명 *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="안건명을 입력하세요" className="notion-input" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>입안자</label>
                  <input value={form.proposer} onChange={e => setForm(p => ({ ...p, proposer: e.target.value }))} placeholder="입안자 이름" className="notion-input" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>팀</label>
                  <select value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))} className="notion-select">
                    {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>상태</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="notion-select">
                    {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>입안일</label>
                  <input type="date" value={form.proposed_date} onChange={e => setForm(p => ({ ...p, proposed_date: e.target.value }))} className="notion-input" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} className="notion-btn-secondary">취소</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()} className="notion-btn-primary">
                {saving ? '저장 중...' : <><Check size={14} /> 저장</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="notion-card p-12" style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>
          <Clock size={36} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13 }}>등록된 안건이 없습니다</div>
          <button className="notion-btn-primary" style={{ marginTop: 12 }} onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }}>
            <Plus size={14} /> 새 안건 등록
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(agenda => (
            <motion.div
              key={agenda.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="notion-card"
              style={{ padding: 16, position: 'relative' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: `${getStatusColor(agenda.status)}15`,
                  color: getStatusColor(agenda.status),
                }}>
                  {agenda.status}
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    onClick={() => handleDiscordSend(agenda)}
                    disabled={sending === agenda.id}
                    style={{
                      padding: 4, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer',
                      color: sentIds.has(agenda.id) || agenda.is_sent ? '#37B24D' : 'var(--muted-foreground)',
                    }}
                    title="디스코드 전송"
                  >
                    {sending === agenda.id
                      ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Send size={12} />
                    }
                  </button>
                  <button onClick={() => handleEdit(agenda)} style={{ padding: 4, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)' }} title="수정">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(agenda.id)} disabled={deleting === agenda.id} style={{ padding: 4, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#E03E3E' }} title="삭제">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <h3 style={{
                fontSize: 14, fontWeight: 600, marginBottom: 12, lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {agenda.title}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span>{agenda.proposer || '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: `${TEAM_COLORS[agenda.team] || '#868E96'}15`,
                    color: TEAM_COLORS[agenda.team] || '#868E96',
                    padding: '1px 5px', borderRadius: 3,
                  }}>
                    {agenda.team}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                  <span>{agenda.proposed_date?.split('T')[0] || '-'}</span>
                </div>
              </div>

              {/* Status quick change */}
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {STATUS_OPTIONS.filter(s => s !== agenda.status).slice(0, 2).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(agenda.id, s)}
                    style={{
                      flex: 1, fontSize: 10, fontWeight: 600, padding: '4px 6px', borderRadius: 5,
                      border: '1px solid var(--border)', cursor: 'pointer',
                      background: 'var(--secondary)',
                      color: getStatusColor(s),
                    }}
                  >
                    → {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="notion-card" style={{ overflow: 'hidden' }}>
          <table className="notion-table">
            <thead>
              <tr>
                <th>안건명</th>
                <th>입안자</th>
                <th>팀</th>
                <th>상태</th>
                <th>입안일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(agenda => (
                <tr key={agenda.id}>
                  <td style={{ fontWeight: 500 }}>{agenda.title}</td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{agenda.proposer || '-'}</td>
                  <td>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: `${TEAM_COLORS[agenda.team] || '#868E96'}15`,
                      color: TEAM_COLORS[agenda.team] || '#868E96',
                      padding: '2px 7px', borderRadius: 4,
                    }}>
                      {agenda.team}
                    </span>
                  </td>
                  <td>
                    <select
                      value={agenda.status}
                      onChange={e => handleStatusChange(agenda.id, e.target.value)}
                      style={{
                        fontSize: 11, fontWeight: 600, border: 'none', outline: 'none',
                        background: `${getStatusColor(agenda.status)}15`,
                        color: getStatusColor(agenda.status),
                        padding: '3px 6px', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{agenda.proposed_date?.split('T')[0] || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button
                        onClick={() => handleDiscordSend(agenda)}
                        disabled={sending === agenda.id}
                        style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: sentIds.has(agenda.id) || agenda.is_sent ? '#37B24D' : 'var(--muted-foreground)' }}
                        title="디스코드 전송"
                      >
                        <Send size={12} />
                      </button>
                      <button onClick={() => handleEdit(agenda)} style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted-foreground)' }} title="수정">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDelete(agenda.id)} disabled={deleting === agenda.id} style={{ padding: 5, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', color: '#E03E3E' }} title="삭제">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
