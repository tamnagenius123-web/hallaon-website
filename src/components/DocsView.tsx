import React, { useState, useEffect } from 'react';
import { Meeting } from '../types';
import { HanraonEditor } from './Editor';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, X, ChevronRight, ChevronDown, FileText, Clock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DocsViewProps {
  meetings: Meeting[];
}

const CATEGORIES = ['전체 회의', 'PM', 'CD', 'FS', 'DM', 'OPS'];

const CATEGORY_EMOJI: Record<string, string> = {
  '전체 회의': '🏛️', 'PM': '📋', 'CD': '🎨', 'FS': '💻', 'DM': '📊', 'OPS': '⚙️'
};

export const DocsView = ({ meetings }: DocsViewProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(meetings[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('전체');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: true }), {})
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const selectedMeeting = meetings.find(m => m.id === selectedId) || null;

  useEffect(() => {
    if (selectedMeeting) {
      setTitleValue(selectedMeeting.title || '');
      setTitleEdit(false);
    }
  }, [selectedId]);

  const filteredMeetings = meetings.filter(m => {
    if (filterCategory !== '전체' && m.category !== filterCategory) return false;
    if (searchQuery && !m.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const groupedMeetings = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = filteredMeetings.filter(m => m.category === cat);
    return acc;
  }, {} as Record<string, Meeting[]>);

  const handleSave = async (content: string) => {
    if (!selectedMeeting) return;
    setSaving(true);
    try {
      const parsedContent = typeof content === 'string' ? (() => { try { return JSON.parse(content); } catch { return content; } })() : content;
      const { error } = await supabase.from('meetings').update({ content: parsedContent }).eq('id', selectedMeeting.id);
      if (error) throw error;
    } catch (err) { console.error('문서 저장 실패:', err); }
    finally { setSaving(false); }
  };

  const handleTitleSave = async () => {
    if (!selectedMeeting || !titleValue.trim()) return;
    try {
      await supabase.from('meetings').update({ title: titleValue }).eq('id', selectedMeeting.id);
      setTitleEdit(false);
    } catch (err) { console.error('제목 저장 실패:', err); }
  };

  const handleCategoryChange = async (category: string) => {
    if (!selectedMeeting) return;
    try {
      await supabase.from('meetings').update({ category }).eq('id', selectedMeeting.id);
    } catch (err) { console.error('카테고리 업데이트 실패:', err); }
  };

  const handleCreateNew = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .insert([{
          title: '제목 없는 문서',
          content: [],
          date: new Date().toISOString(),
          category: CATEGORIES[0],
          author_id: JSON.parse(localStorage.getItem('hallaon_session') || '{}')?.user?.id || 'anonymous',
        }])
        .select().single();
      if (error) throw error;
      if (data) {
        setSelectedId(data.id);
        setExpandedFolders(p => ({ ...p, [data.category]: true }));
      }
    } catch (err) { console.error('문서 생성 실패:', err); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
      if (selectedId === id) {
        const next = meetings.find(m => m.id !== id);
        setSelectedId(next?.id || null);
      }
      setDeleteConfirm(null);
    } catch (err) { console.error('삭제 실패:', err); }
  };

  const toggleFolder = (cat: string) => {
    setExpandedFolders(p => ({ ...p, [cat]: !p[cat] }));
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', height: 'calc(100vh - 200px)', minHeight: 600 }}>
      {/* Sidebar - Document List */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
        background: 'var(--sidebar)', borderRadius: '12px 0 0 12px',
      }}>
        {/* Search & New */}
        <div style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="문서 검색..."
              className="notion-input"
              style={{ paddingLeft: 28, fontSize: 12, padding: '6px 8px 6px 28px' }}
            />
          </div>
          <button
            onClick={handleCreateNew}
            disabled={creating}
            className="notion-btn-primary w-full justify-center"
            style={{ fontSize: 12, padding: '6px 10px' }}
          >
            <Plus size={13} />
            {creating ? '생성 중...' : '새 문서'}
          </button>
        </div>

        {/* Category Filter */}
        <div style={{ padding: '8px 6px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {['전체', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                  border: 'none', cursor: 'pointer',
                  background: filterCategory === cat ? 'var(--primary)' : 'var(--secondary)',
                  color: filterCategory === cat ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Folder Tree */}
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
          {CATEGORIES.filter(cat => filterCategory === '전체' || filterCategory === cat).map(cat => {
            const catMeetings = groupedMeetings[cat];
            if (catMeetings.length === 0 && searchQuery) return null;
            const isExpanded = expandedFolders[cat];
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleFolder(cat)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)',
                    textAlign: 'left',
                  }}
                  className="hover:bg-[var(--sidebar-hover)]"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span>{CATEGORY_EMOJI[cat]} {cat}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--secondary)', borderRadius: 99, padding: '0 5px', color: 'var(--muted-foreground)' }}>
                    {catMeetings.length}
                  </span>
                </button>

                {isExpanded && catMeetings.map(m => (
                  <div
                    key={m.id}
                    style={{
                      position: 'relative',
                      background: selectedId === m.id ? 'var(--sidebar-hover)' : undefined,
                    }}
                    className="group"
                  >
                    <button
                      onClick={() => setSelectedId(m.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px 5px 26px', background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 12, textAlign: 'left',
                        color: selectedId === m.id ? 'var(--foreground)' : 'var(--muted-foreground)',
                        fontWeight: selectedId === m.id ? 500 : 400,
                      }}
                      className="hover:bg-[var(--sidebar-hover)]"
                    >
                      <FileText size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.title || '제목 없음'}
                      </span>
                    </button>
                    {/* Delete button (hover) */}
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(m.id); }}
                      className="hover-actions"
                      style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 3, borderRadius: 4, color: 'var(--muted-foreground)',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--card)', borderRadius: '0 12px 12px 0', border: '1px solid var(--border)', borderLeft: 'none' }}>
        {selectedMeeting ? (
          <>
            {/* Document Header */}
            <div style={{ padding: '20px 32px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              {/* Title */}
              {titleEdit ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    value={titleValue}
                    onChange={e => setTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setTitleEdit(false); }}
                    className="notion-input"
                    style={{ fontSize: 22, fontWeight: 700, border: 'none', borderBottom: '2px solid var(--primary)', borderRadius: 0, padding: '4px 0', background: 'transparent', flex: 1 }}
                    autoFocus
                  />
                  <button onClick={handleTitleSave} className="notion-btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}>저장</button>
                  <button onClick={() => setTitleEdit(false)} className="notion-btn-ghost" style={{ padding: '4px 8px' }}><X size={14} /></button>
                </div>
              ) : (
                <h2
                  onClick={() => setTitleEdit(true)}
                  style={{ fontSize: 22, fontWeight: 700, cursor: 'text', marginBottom: 10, color: 'var(--foreground)', letterSpacing: '-0.02em' }}
                  className="hover:opacity-70 transition-opacity"
                >
                  {selectedMeeting.title || '제목 없음'}
                </h2>
              )}

              {/* Meta */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--muted-foreground)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} />
                  {selectedMeeting.date ? new Date(selectedMeeting.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>분류:</span>
                  <select
                    value={selectedMeeting.category || ''}
                    onChange={e => handleCategoryChange(e.target.value)}
                    style={{
                      background: 'var(--secondary)', border: 'none', outline: 'none',
                      borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 600,
                      color: 'var(--foreground)', cursor: 'pointer',
                    }}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                {saving && <span style={{ color: 'var(--primary)' }}>저장 중...</span>}
              </div>
            </div>

            {/* Editor */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0 32px 32px' }}>
              <HanraonEditor
                key={selectedMeeting.id}
                initialContent={selectedMeeting.content}
                onChange={handleSave}
              />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', gap: 12 }}>
            <FileText size={40} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: 14 }}>문서를 선택하거나 새로 만드세요</div>
            <button onClick={handleCreateNew} className="notion-btn-primary" style={{ marginTop: 4 }}>
              <Plus size={14} /> 새 문서 만들기
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-container" style={{ maxWidth: 360 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>문서 삭제</h3>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20 }}>
              이 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} className="notion-btn-secondary">취소</button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{ background: '#E03E3E', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
