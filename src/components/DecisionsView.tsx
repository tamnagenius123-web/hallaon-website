import React, { useState } from 'react';
import { Decision, Agenda } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, X, Check, BarChart2, Scale, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getStatusColor } from './DashboardView';

interface DecisionsViewProps {
  decisions: Decision[];
  agendas: Agenda[];
}

interface Criterion { name: string; weight: number; }
interface Alternative { name: string; scores: number[]; }

const RESULT_COLORS = ['#2383E2', '#AE3EC9', '#37B24D', '#F76707', '#E67700'];

export const DecisionsView = ({ decisions, agendas }: DecisionsViewProps) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState('');
  const [criteria, setCriteria] = useState<Criterion[]>([
    { name: '', weight: 40 },
    { name: '', weight: 30 },
    { name: '', weight: 30 },
  ]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([
    { name: '', scores: [5, 5, 5] },
    { name: '', scores: [5, 5, 5] },
  ]);
  const [result, setResult] = useState<{ alt: string; score: number }[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const activeAgendas = agendas.filter(a => a.status !== '완료');
  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 0), 0);

  const addCriterion = () => setCriteria(p => [...p, { name: '', weight: 0 }]);
  const removeCriterion = (i: number) => {
    setCriteria(p => p.filter((_, idx) => idx !== i));
    setAlternatives(p => p.map(a => ({ ...a, scores: a.scores.filter((_, idx) => idx !== i) })));
  };
  const addAlternative = () => setAlternatives(p => [...p, { name: '', scores: criteria.map(() => 5) }]);
  const removeAlternative = (i: number) => setAlternatives(p => p.filter((_, idx) => idx !== i));

  const handleRun = () => {
    const valid = criteria.filter(c => c.name.trim());
    const validAlts = alternatives.filter(a => a.name.trim());
    if (valid.length === 0 || validAlts.length < 2) return;
    if (totalWeight !== 100) { alert(`가중치 합계: ${totalWeight}% (100%가 되어야 합니다)`); return; }

    const res = validAlts.map(alt => {
      const score = valid.reduce((sum, cr, i) => {
        return sum + ((alt.scores[i] || 5) * (cr.weight / 100));
      }, 0);
      return { alt: alt.name, score: Math.round(score * 100) / 100 };
    }).sort((a, b) => b.score - a.score);

    setResult(res);
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('decisions').insert([{
        agenda_id: agendas.find(a => a.title === selectedAgenda)?.id || null,
        criteria: criteria.filter(c => c.name.trim()),
        alternatives: alternatives.filter(a => a.name.trim()),
        best_choice: result[0]?.alt,
        created_at: new Date().toISOString(),
      }]);
      if (error) throw error;
      setShowForm(false);
      setResult(null);
    } catch (err) { console.error('저장 실패:', err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 의사결정 기록을 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      await supabase.from('decisions').delete().eq('id', id);
    } catch (err) { console.error('삭제 실패:', err); }
    finally { setDeleting(null); }
  };

  const getAgendaTitle = (id: string) => agendas.find(a => a.id === id)?.title || id;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>가중치 평가 알고리즘으로 최적 대안 선정</div>
        </div>
        <button className="notion-btn-primary" onClick={() => { setShowForm(true); setResult(null); }}>
          <Plus size={15} /> 새 모델 생성
        </button>
      </div>

      {/* Existing decisions */}
      {decisions.length > 0 && (
        <div className="notion-card p-5">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>📋 의사결정 기록</h3>
          <table className="notion-table">
            <thead>
              <tr>
                <th>대상 안건</th>
                <th>최적 대안</th>
                <th>기준 수</th>
                <th>대안 수</th>
                <th>작성일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {decisions.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500 }}>{d.agenda_id ? getAgendaTitle(d.agenda_id) : '-'}</td>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                      🏆 {d.best_choice || '분석 중'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>
                    {Array.isArray(d.criteria) ? d.criteria.length : '-'}개
                  </td>
                  <td style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>
                    {Array.isArray(d.alternatives) ? d.alternatives.length : '-'}개
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {d.created_at ? new Date(d.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      className="notion-btn-ghost"
                      style={{ padding: 5, color: '#E03E3E' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending agendas */}
      <div className="notion-card p-5">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>🗂️ 결정 대기 안건</h3>
        {activeAgendas.length === 0 ? (
          <div style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>진행 중인 안건이 없습니다.</div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {activeAgendas.map(agenda => (
              <div key={agenda.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{agenda.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>제안자: {agenda.proposer} · {agenda.team}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                    background: `${getStatusColor(agenda.status)}15`,
                    color: getStatusColor(agenda.status),
                  }}>{agenda.status}</span>
                  <button
                    onClick={() => { setSelectedAgenda(agenda.title); setShowForm(true); setResult(null); }}
                    className="notion-btn-primary"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                  >
                    <Scale size={11} /> 평가 시작
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setResult(null); } }}>
          <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 720, maxHeight: '90vh', overflow: 'auto', padding: 28, margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>⚖️ 의사결정 모델</h3>
              <button onClick={() => { setShowForm(false); setResult(null); }} className="notion-btn-ghost" style={{ padding: 6 }}><X size={16} /></button>
            </div>

            {/* Target Agenda */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 6 }}>대상 안건</label>
              <select
                value={selectedAgenda}
                onChange={e => setSelectedAgenda(e.target.value)}
                className="notion-select"
              >
                <option value="">안건 선택 (선택사항)</option>
                {agendas.map(a => <option key={a.id} value={a.title}>{a.title}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Criteria */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>📐 평가 기준 & 가중치</div>
                  <button onClick={addCriterion} className="notion-btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>+ 추가</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {criteria.map((cr, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        value={cr.name}
                        onChange={e => setCriteria(p => p.map((c, idx) => idx === i ? { ...c, name: e.target.value } : c))}
                        placeholder={`기준 ${i+1}`}
                        className="notion-input"
                        style={{ flex: 1, fontSize: 12 }}
                      />
                      <input
                        type="number" min={0} max={100}
                        value={cr.weight}
                        onChange={e => setCriteria(p => p.map((c, idx) => idx === i ? { ...c, weight: +e.target.value } : c))}
                        className="notion-input"
                        style={{ width: 58, fontSize: 12 }}
                        placeholder="%"
                      />
                      <button onClick={() => removeCriterion(i)} className="notion-btn-ghost" style={{ padding: 4, color: '#E03E3E' }}><X size={12} /></button>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, fontWeight: 600, color: totalWeight === 100 ? '#37B24D' : '#E03E3E', marginTop: 4 }}>
                    합계: {totalWeight}% {totalWeight !== 100 && '(100%가 되어야 합니다)'}
                  </div>
                </div>
              </div>

              {/* Alternatives */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>🎯 비교 대안</div>
                  <button onClick={addAlternative} className="notion-btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>+ 추가</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alternatives.map((alt, ai) => (
                    <div key={ai} style={{ background: 'var(--secondary)', borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        <input
                          value={alt.name}
                          onChange={e => setAlternatives(p => p.map((a, idx) => idx === ai ? { ...a, name: e.target.value } : a))}
                          placeholder={`대안 ${ai+1}`}
                          className="notion-input"
                          style={{ flex: 1, fontSize: 12 }}
                        />
                        <button onClick={() => removeAlternative(ai)} className="notion-btn-ghost" style={{ padding: 4, color: '#E03E3E' }}><X size={12} /></button>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {criteria.map((cr, ci) => (
                          <div key={ci} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontSize: 9, color: 'var(--muted-foreground)', fontWeight: 600 }}>{cr.name || `기준${ci+1}`}</span>
                            <input
                              type="number" min={1} max={10}
                              value={alt.scores[ci] ?? 5}
                              onChange={e => setAlternatives(p => p.map((a, idx) => idx === ai ? { ...a, scores: a.scores.map((s, si) => si === ci ? +e.target.value : s) } : a))}
                              style={{ width: 44, textAlign: 'center', fontSize: 13, fontWeight: 700, border: '1px solid var(--border)', borderRadius: 5, padding: '3px 4px', background: 'var(--card)', color: 'var(--foreground)', outline: 'none' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              onClick={handleRun}
              className="notion-btn-primary w-full justify-center"
              style={{ marginTop: 20, padding: '10px', fontSize: 14, fontWeight: 700 }}
            >
              <BarChart2 size={16} /> 🧠 의사결정 실행
            </button>

            {/* Results */}
            {result && (
              <div style={{ marginTop: 20 }}>
                {/* Best */}
                <div style={{ background: 'linear-gradient(135deg, rgba(35,131,226,0.1), rgba(55,178,77,0.05))', border: '1px solid rgba(35,131,226,0.2)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>🏆 추천 결과</div>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{result[0].alt}</div>
                  <div style={{ fontSize: 14, color: 'var(--muted-foreground)', marginTop: 2 }}>최고 점수: {result[0].score}점</div>
                </div>

                {/* Bar chart */}
                <div style={{ height: 180, marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={result.map(r => ({ name: r.alt, score: r.score }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={32}>
                        {result.map((_, i) => (
                          <Cell key={i} fill={RESULT_COLORS[i % RESULT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setResult(null)} className="notion-btn-secondary">재평가</button>
                  <button onClick={handleSave} disabled={saving} className="notion-btn-primary">
                    {saving ? '저장 중...' : <><Check size={14} /> 결과 저장</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
