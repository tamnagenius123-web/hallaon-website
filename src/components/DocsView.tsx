import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Block } from '@blocknote/core';
import { Meeting } from '../types';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import {
  Plus, Trash2, X, ChevronRight, ChevronDown,
  Search, BookOpen, Save, Image, Clock, 
  Download, CloudUpload, Loader2 
} from 'lucide-react';
import { TEAM_OPTIONS as ORG_TEAMS, TEAM_COLORS as ORG_COLORS } from '../lib/orgChart';

import { HanraonEditor } from './Editor'; 

interface DocsViewProps {
  meetings: Meeting[];
}

const CATEGORIES = ['전체 회의', ...ORG_TEAMS];
const CATEGORY_EMOJI: Record<string, string> = {
  '전체 회의': '🏛️', PM: '📋', CD: '🎨', FS: '💻', DM: '📊', OPS: '⚙️',
};
const CATEGORY_COLORS: Record<string, string> = {
  '전체 회의': '#2383E2', ...ORG_COLORS,
};

const COVER_GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)', 'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)', 'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)', 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)', 'linear-gradient(135deg,#0ba360,#3cba92)',
  'linear-gradient(135deg,#2383E2,#3ec9d6)', 'linear-gradient(135deg,#AE3EC9,#f093fb)',
];
const DOC_EMOJIS = ['📋','📄','📝','📌','📎','📊','📈','💡','🔖','🗒️','📰','📓','📔','📒','📃','🗃️','📑','🔍','✅','⭐'];

function parseContentToBlocks(raw: any): Block[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    if (raw.length > 0 && raw[0]?.type) return raw as Block[];
    return [];
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed[0]?.type) return parsed as Block[];
      } catch {}
    }
    return trimmed.split('\n').filter(Boolean).map(line => ({
      id: Math.random().toString(36).slice(2),
      type: 'paragraph',
      content: [{ type: 'text', text: line, styles: {} }],
    })) as any;
  }
  return [];
}

const EmojiPicker = ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => (
  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', zIndex: 100, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.18)', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, top: '110%', left: 0, minWidth: 180 }}>
    {DOC_EMOJIS.map(e => <button key={e} onClick={() => { onSelect(e); onClose(); }} style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6 }} onMouseEnter={el => (el.currentTarget.style.background = 'var(--secondary)')} onMouseLeave={el => (el.currentTarget.style.background = 'none')}>{e}</button>)}
  </div>
);

const CoverPicker = ({ onSelect, onClose }: { onSelect: (g: string) => void; onClose: () => void }) => (
  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', zIndex: 100, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.18)', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, top: '110%', left: 0, minWidth: 270 }}>
    <button onClick={() => { onSelect(''); onClose(); }} style={{ gridColumn: '1/-1', fontSize: 12, color: 'var(--muted-foreground)', background: 'var(--secondary)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', marginBottom: 4 }}>커버 제거</button>
    {COVER_GRADIENTS.map((g, i) => <button key={i} onClick={() => { onSelect(g); onClose(); }} style={{ width: 44, height: 28, borderRadius: 6, background: g, border: 'none', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />)}
  </div>
);

export const DocsView = ({ meetings: initialMeetings }: DocsViewProps) => {
  const { optimisticAddMeeting, optimisticUpdateMeeting, optimisticDeleteMeeting } = useAppContext();
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('전체 회의');
  const [search, setSearch] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ title: '새 문서', category: '전체 회의', emoji: '📄', cover: '' });
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showNewEmoji, setShowNewEmoji] = useState(false);
  const [showNewCover, setShowNewCover] = useState(false);
  const [showDocEmoji, setShowDocEmoji] = useState(false);
  const [showDocCover, setShowDocCover] = useState(false);

  useEffect(() => { setMeetings(initialMeetings); }, [initialMeetings]);
  const selectedMeeting = useMemo(() => meetings.find(m => m.id === selectedId) ?? null, [meetings, selectedId]);
  const currentInitialContent = useMemo(() => {
    if (!selectedMeeting) return [] as Block[];
    return parseContentToBlocks(selectedMeeting.content);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleEditorSave = useCallback(async (contentStr: string) => {
    if (!selectedId) return;
    await supabase.from('meetings').update({ content: contentStr }).eq('id', selectedId);
    optimisticUpdateMeeting(selectedId, { content: contentStr });
    setSavedAt(new Date());
  }, [selectedId, optimisticUpdateMeeting]);

  const handleMetaUpdate = useCallback(async (patch: Record<string, any>) => {
    if (!selectedId) return;
    setMeetings(prev => prev.map(m => m.id === selectedId ? { ...m, ...patch } : m));
    optimisticUpdateMeeting(selectedId, patch);
    const safePatch: Record<string, any> = {};
    if (patch.title !== undefined) safePatch.title = patch.title;
    if (Object.keys(safePatch).length > 0) {
      await supabase.from('meetings').update(safePatch).eq('id', selectedId);
    }
  }, [selectedId, optimisticUpdateMeeting]);

  const handleCreateDoc = async () => {
    if (creating) return;
    setCreating(true);
    const title = newForm.title.trim() || '새 문서';
    const initialBlocks: Block[] = [{ id: Math.random().toString(36).slice(2), type: 'heading', props: { level: 1 }, content: [{ type: 'text', text: title, styles: {} }], children: [] } as any];
    const payload = { category: newForm.category, date: new Date().toISOString().split('T')[0], title, author_id: 'user', content: JSON.stringify(initialBlocks) };
    try {
      const { data, error } = await supabase.from('meetings').insert([payload]).select().single();
      if (error) throw error;
      if (data) {
        setMeetings(prev => [data as Meeting, ...prev]);
        optimisticAddMeeting(data as Meeting);
        setSelectedId(data.id);
        setShowNewForm(false);
        setNewForm({ title: '새 문서', category: '전체 회의', emoji: '📄', cover: '' });
      }
    } catch (err: any) { alert('오류: ' + err.message); } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 문서를 삭제하시겠습니까?')) return;
    setMeetings(prev => prev.filter(m => m.id !== id));
    optimisticDeleteMeeting(id);
    await supabase.from('meetings').delete().eq('id', id);
    if (selectedId === id) setSelectedId(null);
  };

  const handlePushToDrive = async () => {
    if (!selectedMeeting) return;
    if (!window.confirm(`'${selectedMeeting.title}' 문서를 구글 드라이브에 텍스트 파일로 백업하시겠습니까?\n(로봇 계정에 드라이브 '편집자' 권한이 있어야 합니다)`)) return;

    setExporting(true);
    try {
      let plainText = `# ${selectedMeeting.title}\n\n`;
      try {
        const blocks = JSON.parse(selectedMeeting.content);
        const extractText = (bks: any[]) => {
          bks.forEach(b => {
             if (b.content && Array.isArray(b.content)) plainText += b.content.map((c:any) => c.text || '').join('') + '\n\n';
             if (b.children) extractText(b.children);
          });
        };
        extractText(blocks);
      } catch(e) { plainText += selectedMeeting.content; }

      const base64String = btoa(unescape(encodeURIComponent(plainText)));

      const res = await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedMeeting.title}.txt`,
          mimeType: 'text/plain',
          base64: base64String,
          folderId: 'root'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(()=>({}));
        throw new Error(errData.error || errData.details || `상태 코드: ${res.status}`);
      }
      alert('✅ 구글 드라이브에 성공적으로 백업되었습니다!');
    } catch (err: any) {
      alert('❌ 백업 실패: ' + err.message + '\n\n* 구글 드라이브 폴더에 서비스 계정이 "편집자(Editor)"로 초대되어 있는지 확인하세요!');
    } finally {
      setExporting(false);
    }
  };

  const filtered = useMemo(() => meetings.filter(m => {
    const matchCat = filterCategory === '전체 회의' || m.category === filterCategory;
    const matchSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [meetings, filterCategory, search]);

  const grouped = useMemo(() => {
    const g: Record<string, Meeting[]> = {};
    CATEGORIES.forEach(cat => { g[cat] = filtered.filter(m => m.category === cat); });
    return g;
  }, [filtered]);

  const toggleCat = (cat: string) => setExpandedCategories(prev => {
    const next = new Set(prev);
    if (next.has(cat)) next.delete(cat); else next.add(cat);
    return next;
  });

  const getMeta = (m: Meeting) => ({ emoji: (m as any).emoji || '📄', cover: (m as any).cover || '' });

  return (
    <div className="docs-view-wrapper" style={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      
      {/* ─── 좌측 사이드바 ─────────────────────────────────────────── */}
      <div className="no-print" style={{ width: 255, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--card)' }}>
        <div style={{ padding: '14px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={14} color="var(--primary)" /><span style={{ fontWeight: 700, fontSize: 13 }}>문서 허브</span></div>
            <button onClick={() => setShowNewForm(true)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}><Plus size={11} /> 새 문서</button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색..." style={{ width: '100%', padding: '5px 8px 5px 26px', boxSizing: 'border-box', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--foreground)', outline: 'none' }} />
          </div>
        </div>

        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} style={{ fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 12, border: 'none', cursor: 'pointer', background: filterCategory === cat ? (CATEGORY_COLORS[cat] || 'var(--primary)') : 'var(--secondary)', color: filterCategory === cat ? '#fff' : 'var(--muted-foreground)' }}>
              {CATEGORY_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
          {filterCategory === '전체 회의' ? CATEGORIES : [filterCategory].map(cat => {
            const docs = grouped[cat] ?? [];
            if (filterCategory !== '전체 회의' && docs.length === 0) return null;
            const expanded = expandedCategories.has(cat);
            return (
              <div key={cat} style={{ marginBottom: 2 }}>
                <button onClick={() => toggleCat(cat)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 6px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                  {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{CATEGORY_EMOJI[cat]} {cat}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--secondary)', borderRadius: 10, padding: '1px 5px' }}>{docs.length}</span>
                </button>
                {expanded && docs.map(doc => {
                  const isActive = doc.id === selectedId;
                  return (
                    <div key={doc.id} className="doc-item" onClick={() => setSelectedId(doc.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 20px', borderRadius: 6, cursor: 'pointer', marginBottom: 1, background: isActive ? 'var(--primary)' : 'transparent', color: isActive ? '#fff' : 'var(--foreground)' }}>
                      <span style={{ fontSize: 13 }}>{getMeta(doc).emoji}</span>
                      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>{doc.title}</span>
                      <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }} className="doc-delete-btn no-print" style={{ background: 'none', border: 'none', cursor: 'pointer', color: isActive ? '#fff' : 'var(--muted-foreground)' }}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 에디터 영역 ──────────────────────────────────────────── */}
      <div className="editor-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
        {selectedMeeting ? (
          <>
            {getMeta(selectedMeeting).cover && (
              <div style={{ height: 140, background: getMeta(selectedMeeting).cover, flexShrink: 0, position: 'relative' }}>
                <div className="no-print" style={{ position: 'absolute', bottom: 10, right: 14 }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button onClick={() => setShowDocCover(p => !p)} style={{ background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Image size={11} /> 커버 변경</button>
                    {showDocCover && <CoverPicker onSelect={cover => { handleMetaUpdate({ cover }); setShowDocCover(false); }} onClose={() => setShowDocCover(false)} />}
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '18px 32px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' }}>
                <div className="no-print" style={{ position: 'relative' }}>
                  <button onClick={() => setShowDocEmoji(p => !p)} style={{ fontSize: 30, background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}>{getMeta(selectedMeeting).emoji}</button>
                  {showDocEmoji && <EmojiPicker onSelect={emoji => { handleMetaUpdate({ emoji }); setShowDocEmoji(false); }} onClose={() => setShowDocEmoji(false)} />}
                </div>

                {!getMeta(selectedMeeting).cover && (
                  <div className="no-print" style={{ position: 'relative' }}>
                    <button onClick={() => setShowDocCover(p => !p)} style={{ fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--secondary)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><Image size={11} /> 커버</button>
                    {showDocCover && <CoverPicker onSelect={cover => { handleMetaUpdate({ cover }); setShowDocCover(false); }} onClose={() => setShowDocCover(false)} />}
                  </div>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => window.print()} className="notion-btn-ghost no-print" style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Download size={13} /> PDF 저장</button>
                  <button onClick={handlePushToDrive} disabled={exporting} className="notion-btn-ghost no-print" style={{ padding: '4px 8px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
                    {exporting ? <Loader2 size={13} className="animate-spin" /> : <CloudUpload size={13} />} 드라이브 백업
                  </button>
                  {savedAt && <span className="no-print" style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}><Save size={11} /> {savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장</span>}
                </div>
              </div>

              {/* 다크모드 대응을 위해 className="doc-title-input" 추가 */}
              <input
                className="doc-title-input"
                value={selectedMeeting.title}
                onChange={e => handleMetaUpdate({ title: e.target.value })}
                style={{
                  width: '100%', fontSize: 28, fontWeight: 800, border: 'none', outline: 'none', background: 'transparent',
                  color: 'var(--foreground)', letterSpacing: '-0.04em', padding: '0 0 8px', boxSizing: 'border-box', lineHeight: 1.25,
                }}
                placeholder="제목 없음"
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, background: `${CATEGORY_COLORS[selectedMeeting.category] || '#868E96'}20`, color: CATEGORY_COLORS[selectedMeeting.category] || '#868E96', padding: '2px 8px', borderRadius: 12 }}>
                  {CATEGORY_EMOJI[selectedMeeting.category]} {selectedMeeting.category}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {selectedMeeting.date}</span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px' }}>
              <HanraonEditor key={selectedId} initialContent={currentInitialContent} onChange={handleEditorSave} />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
            <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.25 }} />
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>문서를 선택하거나 새로 만드세요</div>
            <button onClick={() => setShowNewForm(true)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> 새 문서 만들기</button>
          </div>
        )}
      </div>

      {showNewForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => !creating && setShowNewForm(false)}>
          {/* 새 문서 폼 UI (생략 없이 그대로 유지) */}
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>새 문서 만들기</h3>
              <button onClick={() => setShowNewForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={18} /></button>
            </div>
            {newForm.cover && <div style={{ height: 70, background: newForm.cover, borderRadius: 8, marginBottom: 12 }} />}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setShowNewEmoji(p => !p); setShowNewCover(false); }} style={{ fontSize: 26, background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>{newForm.emoji}</button>
                {showNewEmoji && <EmojiPicker onSelect={emoji => { setNewForm(p => ({ ...p, emoji })); setShowNewEmoji(false); }} onClose={() => setShowNewEmoji(false)} />}
              </div>
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setShowNewCover(p => !p); setShowNewEmoji(false); }} style={{ fontSize: 12, background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}><Image size={13} /> 커버</button>
                {showNewCover && <CoverPicker onSelect={cover => { setNewForm(p => ({ ...p, cover })); setShowNewCover(false); }} onClose={() => setShowNewCover(false)} />}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 5 }}>제목</label>
              <input value={newForm.title} onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))} placeholder="문서 제목" autoFocus style={{ width: '100%', padding: '9px 12px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' }} onKeyDown={e => e.key === 'Enter' && handleCreateDoc()} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 5 }}>카테고리</label>
              <select value={newForm.category} onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '9px 12px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--foreground)', outline: 'none' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewForm(false)} disabled={creating} style={{ padding: '8px 16px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--foreground)' }}>취소</button>
              <button onClick={handleCreateDoc} disabled={creating} style={{ padding: '8px 20px', background: creating ? 'var(--border)' : 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>{creating ? '생성 중...' : <><Plus size={14} /> 만들기</>}</button>
            </div>
          </div>
        </div>
      )}

      {/* 👇 이번 수정의 핵심: 강력해진 인쇄 CSS와 다크모드 글자색 보정 👇 */}
      <style>{`
        .doc-item { position: relative; }
        .doc-delete-btn { opacity: 0 !important; transition: opacity 0.15s; pointer-events: none; }
        .doc-item:hover .doc-delete-btn { opacity: 1 !important; pointer-events: auto; }
        
        /* 다크모드 시 제목 글자색을 무조건 흰색으로 강제! */
        .dark .doc-title-input { color: #ffffff !important; }
        
        /* 🖨️ 세상에서 제일 완벽한 PDF 인쇄 마법 */
        @media print {
          body * {
            visibility: hidden; /* 일단 화면에 있는 모든 걸 숨깁니다 */
          }
          .editor-main, .editor-main * {
            visibility: visible; /* 오직 에디터 구역만 보이게 살려냅니다 */
          }
          .editor-main {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
          }
          /* 인쇄할 때는 버튼, 아이콘 같은 찌꺼기들 전부 소각 */
          .no-print, .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </div>
  );
};
