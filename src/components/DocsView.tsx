/**
 * DocsView — Semi-Notion 문서 허브
 * @blocknote/react 기반 완전한 블록 에디터
 * 슬래시 커맨드 / 커버 이미지 / 이모지 / 계층 폴더 트리
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Meeting } from '../types';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import {
  Plus, Trash2, X, ChevronRight, ChevronDown, FileText, Clock,
  Search, BookOpen, Loader2, Save, Smile, Image, FolderOpen,
  Folder, MoreHorizontal, Edit3, Star, Hash, Tag,
} from 'lucide-react';
import { TEAM_OPTIONS as ORG_TEAMS, TEAM_COLORS as ORG_COLORS } from '../lib/orgChart';

// ─── BlockNote 에디터 ───────────────────────────────────────────────
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';

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
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)',
  'linear-gradient(135deg,#0ba360,#3cba92)',
  'linear-gradient(135deg,#2383E2,#3ec9d6)',
  'linear-gradient(135deg,#AE3EC9,#f093fb)',
];

const DOC_EMOJIS = ['📋','📄','📝','📌','📎','📊','📈','💡','🔖','🗒️','📰','📓','📔','📒','📃','🗃️','🗄️','📑','🔍','✅'];

// ─── 기본 콘텐츠 블록 ────────────────────────────────────────────────
const DEFAULT_BLOCKS = [
  {
    id: 'heading',
    type: 'heading' as const,
    props: { level: 1 as const },
    content: [{ type: 'text' as const, text: '새 문서', styles: {} }],
    children: [],
  },
  {
    id: 'paragraph',
    type: 'paragraph' as const,
    props: {},
    content: [{ type: 'text' as const, text: '내용을 입력하세요...', styles: {} }],
    children: [],
  },
];

// ─── BlockNote 에디터 컴포넌트 ───────────────────────────────────────
const BlockEditor = ({
  initialContent,
  onChange,
  readOnly = false,
}: {
  initialContent?: any[];
  onChange?: (blocks: any[]) => void;
  readOnly?: boolean;
}) => {
  const editor = useCreateBlockNote({
    initialContent: initialContent && initialContent.length > 0
      ? initialContent
      : DEFAULT_BLOCKS,
  });

  // 변경 감지
  useEffect(() => {
    if (!onChange || readOnly) return;
    const unsubscribe = editor.onChange(() => {
      onChange(editor.document);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [editor, onChange, readOnly]);

  return (
    <BlockNoteView
      editor={editor}
      editable={!readOnly}
      theme="light"
      style={{
        minHeight: 400,
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
      }}
    />
  );
};

// ─── 이모지 선택기 ───────────────────────────────────────────────────
const EmojiPicker = ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => (
  <div
    style={{
      position: 'absolute', zIndex: 50, background: 'var(--card)',
      border: '1px solid var(--border)', borderRadius: 12,
      padding: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4,
      top: '110%', left: 0,
    }}
  >
    {DOC_EMOJIS.map(e => (
      <button key={e} onClick={() => { onSelect(e); onClose(); }}
        style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, lineHeight: 1 }}
        onMouseEnter={el => (el.currentTarget.style.background = 'var(--secondary)')}
        onMouseLeave={el => (el.currentTarget.style.background = 'none')}
      >{e}</button>
    ))}
  </div>
);

// ─── 커버 선택기 ────────────────────────────────────────────────────
const CoverPicker = ({ onSelect, onClose }: { onSelect: (g: string) => void; onClose: () => void }) => (
  <div style={{
    position: 'absolute', zIndex: 50, background: 'var(--card)',
    border: '1px solid var(--border)', borderRadius: 12, padding: 10,
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6,
    top: '110%', left: 0, minWidth: 280,
  }}>
    <button onClick={() => { onSelect(''); onClose(); }}
      style={{ gridColumn: '1/-1', fontSize: 12, color: 'var(--muted-foreground)', background: 'var(--secondary)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', marginBottom: 4 }}>
      커버 제거
    </button>
    {COVER_GRADIENTS.map((g, i) => (
      <button key={i} onClick={() => { onSelect(g); onClose(); }}
        style={{ width: 44, height: 28, borderRadius: 6, background: g, border: 'none', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
      />
    ))}
  </div>
);

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────
export const DocsView = ({ meetings: initialMeetings }: DocsViewProps) => {
  const { optimisticAddMeeting, optimisticUpdateMeeting, optimisticDeleteMeeting } = useAppContext();

  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('전체 회의');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'editor' | 'read'>('editor');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));

  // Form state for new doc
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({
    title: '새 문서',
    category: '전체 회의',
    emoji: '📄',
    cover: '',
  });

  // Editor content (blocks)
  const [editorContent, setEditorContent] = useState<any[]>([]);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Emoji/Cover picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  useEffect(() => { setMeetings(initialMeetings); }, [initialMeetings]);

  const selectedMeeting = meetings.find(m => m.id === selectedId) ?? null;

  // ── 선택 시 에디터 콘텐츠 로드 ──
  useEffect(() => {
    if (!selectedMeeting) { setEditorContent([]); return; }
    try {
      const raw = selectedMeeting.content;
      if (Array.isArray(raw)) {
        setEditorContent(raw);
      } else if (typeof raw === 'string') {
        // 마크다운 레거시 → 단순 paragraph 변환
        setEditorContent([{
          id: 'legacy',
          type: 'paragraph',
          props: {},
          content: [{ type: 'text', text: raw, styles: {} }],
          children: [],
        }]);
      } else if (raw && typeof raw === 'object' && raw.blocks) {
        setEditorContent(raw.blocks);
      } else {
        setEditorContent([]);
      }
    } catch {
      setEditorContent([]);
    }
  }, [selectedId]);

  // ── 자동 저장 (debounce 2s) ──
  const handleContentChange = useCallback((blocks: any[]) => {
    setEditorContent(blocks);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!selectedId) return;
      await supabase.from('meetings').update({ content: blocks }).eq('id', selectedId);
      optimisticUpdateMeeting(selectedId, { content: blocks });
      setSavedAt(new Date());
    }, 2000);
  }, [selectedId, optimisticUpdateMeeting]);

  // ── 새 문서 생성 ──
  const handleCreateDoc = async () => {
    const payload = {
      category: newForm.category,
      date: new Date().toISOString().split('T')[0],
      title: newForm.title || '새 문서',
      author_id: 'user',
      content: [{
        id: 'title-block',
        type: 'heading',
        props: { level: 1 },
        content: [{ type: 'text', text: newForm.title || '새 문서', styles: {} }],
        children: [],
      }],
      emoji: newForm.emoji,
      cover: newForm.cover,
    } as any;

    const tempId = `temp-${Date.now()}`;
    const tempDoc = { id: tempId, ...payload } as Meeting;
    optimisticAddMeeting(tempDoc);
    setMeetings(prev => [tempDoc, ...prev]);

    const { data, error } = await supabase.from('meetings').insert([payload]).select().single();
    if (!error && data) {
      setMeetings(prev => prev.map(m => m.id === tempId ? data : m));
      optimisticDeleteMeeting(tempId);
      optimisticAddMeeting(data);
      setSelectedId(data.id);
    } else {
      setMeetings(prev => prev.filter(m => m.id !== tempId));
      optimisticDeleteMeeting(tempId);
    }
    setShowNewForm(false);
    setNewForm({ title: '새 문서', category: '전체 회의', emoji: '📄', cover: '' });
  };

  // ── 문서 삭제 ──
  const handleDelete = async (id: string) => {
    if (!window.confirm('이 문서를 삭제하시겠습니까?')) return;
    setMeetings(prev => prev.filter(m => m.id !== id));
    optimisticDeleteMeeting(id);
    await supabase.from('meetings').delete().eq('id', id);
    if (selectedId === id) setSelectedId(null);
  };

  // ── 메타 업데이트 (제목/이모지/커버) ──
  const handleMetaUpdate = useCallback(async (patch: Partial<Meeting & { emoji?: string; cover?: string }>) => {
    if (!selectedId) return;
    optimisticUpdateMeeting(selectedId, patch);
    setMeetings(prev => prev.map(m => m.id === selectedId ? { ...m, ...patch } : m));
    await supabase.from('meetings').update(patch).eq('id', selectedId);
  }, [selectedId, optimisticUpdateMeeting]);

  // ── 필터링 ──
  const filtered = meetings.filter(m => {
    const matchCat = filterCategory === '전체 회의' || m.category === filterCategory;
    const matchSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── 카테고리별 그룹 ──
  const grouped: Record<string, Meeting[]> = {};
  for (const cat of CATEGORIES) {
    grouped[cat] = filtered.filter(m =>
      cat === '전체 회의' ? true : m.category === cat
    );
  }

  const visibleCats = filterCategory === '전체 회의' ? CATEGORIES.slice(1) : [filterCategory];

  const toggleCat = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const getMeta = (m: Meeting) => {
    const raw = m as any;
    return { emoji: raw.emoji || '📄', cover: raw.cover || '' };
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, overflow: 'hidden' }}>
      {/* ─── 사이드바 ─────────────────────────────────────────────── */}
      <div style={{
        width: 260, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--card)',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <BookOpen size={15} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: 14 }}>문서 허브</span>
            </div>
            <button
              onClick={() => setShowNewForm(true)}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 6, padding: '4px 9px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Plus size={12} /> 새 문서
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="검색..."
              style={{
                width: '100%', padding: '6px 8px 6px 28px',
                background: 'var(--secondary)', border: '1px solid var(--border)',
                borderRadius: 7, fontSize: 12, color: 'var(--foreground)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{
                fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 12,
                border: 'none', cursor: 'pointer',
                background: filterCategory === cat ? (CATEGORY_COLORS[cat] || 'var(--primary)') : 'var(--secondary)',
                color: filterCategory === cat ? '#fff' : 'var(--muted-foreground)',
              }}
            >
              {CATEGORY_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>

        {/* 문서 목록 트리 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 6px' }}>
          {visibleCats.map(cat => {
            const docs = grouped[cat] ?? [];
            if (docs.length === 0 && filterCategory !== '전체 회의') return null;
            const isExpanded = expandedCategories.has(cat);
            return (
              <div key={cat} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => toggleCat(cat)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 6px', borderRadius: 6, border: 'none',
                    background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
                  }}
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {CATEGORY_EMOJI[cat]} {cat}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, background: 'var(--secondary)',
                    borderRadius: 10, padding: '1px 5px', color: 'var(--muted-foreground)',
                  }}>{docs.length}</span>
                </button>

                {isExpanded && docs.map(doc => {
                  const { emoji } = getMeta(doc);
                  const isActive = doc.id === selectedId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedId(doc.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '5px 6px 5px 22px', borderRadius: 6,
                        cursor: 'pointer', marginBottom: 1,
                        background: isActive ? 'var(--primary)' : 'none',
                        color: isActive ? '#fff' : 'var(--foreground)',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--secondary)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}
                    >
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>
                      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>
                        {doc.title}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0, color: isActive ? '#fff' : 'var(--muted-foreground)' }}
                        className="doc-delete-btn"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}

                {isExpanded && docs.length === 0 && (
                  <div style={{ padding: '4px 22px', fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                    문서 없음
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 에디터 영역 ──────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
        {selectedMeeting ? (
          <>
            {/* 커버 이미지 */}
            {getMeta(selectedMeeting).cover && (
              <div style={{
                height: 160, background: getMeta(selectedMeeting).cover,
                flexShrink: 0, position: 'relative',
              }}>
                <button
                  onClick={() => setShowCoverPicker(p => !p)}
                  style={{
                    position: 'absolute', bottom: 10, right: 14,
                    background: 'rgba(0,0,0,0.35)', color: '#fff',
                    border: 'none', borderRadius: 6, padding: '4px 10px',
                    fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Image size={11} /> 커버 변경
                  {showCoverPicker && (
                    <CoverPicker
                      onSelect={g => handleMetaUpdate({ cover: g } as any)}
                      onClose={() => setShowCoverPicker(false)}
                    />
                  )}
                </button>
              </div>
            )}

            {/* 문서 헤더 */}
            <div style={{ padding: '20px 40px 0', flexShrink: 0 }}>
              {/* 이모지 + 커버 버튼 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
                <button
                  onClick={() => setShowEmojiPicker(p => !p)}
                  style={{ fontSize: 32, background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1, position: 'relative' }}
                >
                  {getMeta(selectedMeeting).emoji}
                  {showEmojiPicker && (
                    <EmojiPicker
                      onSelect={emoji => handleMetaUpdate({ emoji } as any)}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  )}
                </button>
                {!getMeta(selectedMeeting).cover && (
                  <button
                    onClick={() => setShowCoverPicker(p => !p)}
                    style={{
                      fontSize: 11, color: 'var(--muted-foreground)',
                      background: 'var(--secondary)', border: 'none', borderRadius: 5,
                      padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      position: 'relative',
                    }}
                  >
                    <Image size={11} /> 커버 추가
                    {showCoverPicker && (
                      <CoverPicker
                        onSelect={cover => handleMetaUpdate({ cover } as any)}
                        onClose={() => setShowCoverPicker(false)}
                      />
                    )}
                  </button>
                )}

                {/* 자동저장 표시 */}
                <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {savedAt && (
                    <><Save size={11} /> {savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨</>
                  )}
                </div>
              </div>

              {/* 제목 인라인 편집 */}
              <input
                value={selectedMeeting.title}
                onChange={e => handleMetaUpdate({ title: e.target.value })}
                style={{
                  width: '100%', fontSize: 30, fontWeight: 800,
                  border: 'none', outline: 'none', background: 'transparent',
                  color: 'var(--foreground)', letterSpacing: '-0.04em',
                  padding: '0 0 8px', boxSizing: 'border-box',
                  lineHeight: 1.25,
                }}
                placeholder="제목 없음"
              />

              {/* 메타 태그 줄 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  background: `${CATEGORY_COLORS[selectedMeeting.category] || '#868E96'}20`,
                  color: CATEGORY_COLORS[selectedMeeting.category] || '#868E96',
                  padding: '2px 8px', borderRadius: 12,
                }}>
                  {CATEGORY_EMOJI[selectedMeeting.category]} {selectedMeeting.category}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                  <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                  {selectedMeeting.date}
                </span>
              </div>
            </div>

            {/* BlockNote 에디터 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px' }}>
              <BlockEditor
                key={selectedId}
                initialContent={editorContent.length > 0 ? editorContent : undefined}
                onChange={handleContentChange}
              />
            </div>
          </>
        ) : (
          /* 빈 상태 */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted-foreground)',
          }}>
            <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>문서를 선택하거나 새로 만드세요</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>좌측 패널에서 문서를 클릭하거나 + 버튼을 누르세요</div>
            <button
              onClick={() => setShowNewForm(true)}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Plus size={16} /> 새 문서 만들기
            </button>
          </div>
        )}
      </div>

      {/* ─── 새 문서 모달 ─────────────────────────────────────────── */}
      {showNewForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShowNewForm(false)}
        >
          <div
            style={{
              background: 'var(--card)', borderRadius: 16, padding: 28,
              width: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>새 문서</h3>
              <button onClick={() => setShowNewForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <X size={18} />
              </button>
            </div>

            {/* 커버 미리보기 */}
            {newForm.cover && (
              <div style={{ height: 80, background: newForm.cover, borderRadius: 8, marginBottom: 14 }} />
            )}

            {/* 이모지 + 커버 선택 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowEmojiPicker(p => !p)}
                  style={{ fontSize: 28, background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}
                >
                  {newForm.emoji}
                </button>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={emoji => { setNewForm(p => ({ ...p, emoji })); }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowCoverPicker(p => !p)}
                  style={{
                    fontSize: 12, background: 'var(--secondary)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, color: 'var(--foreground)',
                  }}
                >
                  <Image size={13} /> 커버
                </button>
                {showCoverPicker && (
                  <CoverPicker
                    onSelect={cover => { setNewForm(p => ({ ...p, cover })); }}
                    onClose={() => setShowCoverPicker(false)}
                  />
                )}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 5 }}>제목</label>
              <input
                value={newForm.title}
                onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                placeholder="문서 제목"
                autoFocus
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--secondary)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 14, color: 'var(--foreground)',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onKeyDown={e => e.key === 'Enter' && handleCreateDoc()}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 5 }}>카테고리</label>
              <select
                value={newForm.category}
                onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))}
                style={{
                  width: '100%', padding: '9px 12px',
                  background: 'var(--secondary)', border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: 14, color: 'var(--foreground)', outline: 'none',
                }}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewForm(false)}
                style={{
                  padding: '8px 16px', background: 'var(--secondary)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: 13, cursor: 'pointer', color: 'var(--foreground)',
                }}>취소</button>
              <button onClick={handleCreateDoc}
                style={{
                  padding: '8px 20px', background: 'var(--primary)',
                  border: 'none', borderRadius: 8, color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .doc-delete-btn { opacity: 0 !important; }
        div:hover > .doc-delete-btn,
        div:hover .doc-delete-btn { opacity: 1 !important; }
        .bn-container { font-size: 15px; }
        .bn-editor { padding: 16px 0 !important; }
      `}</style>
    </div>
  );
};
