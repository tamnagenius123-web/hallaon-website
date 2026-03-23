import React, { useState } from 'react';
import { Agenda } from '../types';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Plus, CheckCircle2, Clock, AlertCircle, User, Tag, Calendar, Trash2, Pencil, X, Check, Search } from 'lucide-react';
import { getStatusColor } from './DashboardView';

interface AgendasViewProps {
  agendas: Agenda[];
}

const TEAM_OPTIONS = ['PM', 'CD', 'FS', 'DM', 'OPS'];
const STATUS_OPTIONS = ['시작 전', '진행 중', '완료', '보류'];
const TEAM_COLORS: Record<string, string> = {
  PM: '#2383E2', CD: '#AE3EC9', FS: '#37B24D', DM: '#F76707', OPS: '#E67700'
};

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
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AgendaForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterTeam, setFilterTeam] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

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
        const { error } = await supabase.from('agendas').update(form).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('agendas').insert([{ ...form, is_sent: false }]);
        if (error) throw error;
      }
      setShowForm(false);
      setEditId(null);
      setForm(defaultForm);
    } catch (err) { console.error('저장 실패:', err); }
    finally { setSaving(false); }
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
    try {
      const { error } = await supabase.from('agendas').delete().eq('id', id);
      if (error) throw error;
    } catch (err) { console.error('삭제 실패:', err); }
    finally { setDeleting(null); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await supabase.from('agendas').update({ status }).eq('id', id);
    } catch (err) { console.error('상태 변경 실패:', err); }
  };

  return (
    <div className="animate-fade-in space-y-5">
      {/* Top controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="안건명으로 검색..."
            className="notion-input"
            style={{ paddingLeft: 30, fontSize: 13 }}
          />
        </div>
        {/* Filters */}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="notion-select" style={{ width: 110, fontSize: 13 }}>
          <option>전체</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="notion-select" style={{ width: 100, fontSize: 13 }}>
          <option>전체</option>
          {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* View mode */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('card')}
            style={{ padding: '5px 10px', fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500, background: viewMode === 'card' ? 'var(--primary)' : 'transparent', color: viewMode === 'card' ? '#fff' : 'var(--muted-foreground)' }}
          >
            카드
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{ padding: '5px 10px', fontSize: 12, border: 'none', cursor: 'pointer', fontWeight: 500, background: viewMode === 'table' ? 'var(--primary)' : 'transparent', color: viewMode === 'table' ? '#fff' : 'var(--muted-foreground)' }}
          >
            목록
          </button>
        </div>

        <button
          className="notion-btn-primary"
          onClick={() => { setForm(defaultForm); setEditId(null); setShowForm(true); }}
        >
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
              <button onClick={handleSave} disabled={saving} className="notion-btn-primary">
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
          <div>등록된 안건이 없습니다</div>
        </div>
      ) : viewMode === 'card' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(agenda => (
            <motion.div
              key={agenda.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="notion-card group"
              style={{ padding: 16, position: 'relative' }}
            >
              {/* Status badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: `${getStatusColor(agenda.status)}15`,
                  color: getStatusColor(agenda.status),
                }}>
                  {agenda.status}
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={() => handleEdit(agenda)} className="notion-btn-ghost" style={{ padding: 4, opacity: 0, transition: 'opacity 0.15s' }} title="수정"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(agenda.id)} disabled={deleting === agenda.id} className="notion-btn-ghost" style={{ padding: 4, opacity: 0, transition: 'opacity 0.15s', color: '#E03E3E' }} title="삭제"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, lineHeight: 1.4, minHeight: '2.8em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {agenda.title}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: 'var(--muted-foreground)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={11} style={{ color: 'var(--primary)' }} />
                  <span>{agenda.proposer || '-'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={11} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, background: `${TEAM_COLORS[agenda.team] || '#868E96'}15`, color: TEAM_COLORS[agenda.team] || '#868E96', padding: '1px 5px', borderRadius: 3 }}>
                    {agenda.team}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={11} style={{ color: 'var(--primary)' }} />
                  <span>{agenda.proposed_date?.split('T')[0] || '-'}</span>
                </div>
              </div>

              {/* Status quick change */}
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {['완료', '보류'].map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(agenda.id, s)}
                    style={{
                      flex: 1, fontSize: 10, fontWeight: 600, padding: '4px 6px', borderRadius: 5,
                      border: 'none', cursor: 'pointer',
                      background: agenda.status === s ? `${getStatusColor(s)}20` : 'var(--secondary)',
                      color: agenda.status === s ? getStatusColor(s) : 'var(--muted-foreground)',
                    }}
                  >
                    {s === '완료' ? '✓ 완료' : '⏸ 보류'}
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
                    <span style={{ fontSize: 11, fontWeight: 600, background: `${TEAM_COLORS[agenda.team] || '#868E96'}15`, color: TEAM_COLORS[agenda.team] || '#868E96', padding: '2px 7px', borderRadius: 4 }}>
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
                        padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                      }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{agenda.proposed_date?.split('T')[0] || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => handleEdit(agenda)} className="notion-btn-ghost" style={{ padding: 5 }} title="수정"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(agenda.id)} disabled={deleting === agenda.id} className="notion-btn-ghost" style={{ padding: 5, color: '#E03E3E' }} title="삭제"><Trash2 size={12} /></button>
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
