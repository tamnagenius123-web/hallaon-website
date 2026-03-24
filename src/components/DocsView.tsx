import React, { useState, useEffect, useRef } from 'react';
import { Meeting } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, X, ChevronRight, ChevronDown, FileText, Clock, Search, Eye, Edit3 } from 'lucide-react';

interface DocsViewProps {
  meetings: Meeting[];
}

const CATEGORIES = ['전체 회의', 'PM', 'CD', 'FS', 'DM', 'OPS'];

const CATEGORY_EMOJI: Record<string, string> = {
  '전체 회의': '🏛️', 'PM': '📋', 'CD': '🎨', 'FS': '💻', 'DM': '📊', 'OPS': '⚙️'
};

const CATEGORY_COLORS: Record<string, string> = {
  '전체 회의': '#2383E2', 'PM': '#2383E2', 'CD': '#AE3EC9',
  'FS': '#37B24D', 'DM': '#F76707', 'OPS': '#E67700'
};

// Simple markdown renderer
const renderMarkdown = (text: string): string => {
  if (!text) return '<p style="color: var(--muted-foreground); font-style: italic;">내용이 없습니다</p>';

  const lines = text.split('\n');
  const html: string[] = [];
  let inList = false;
  let inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCode) {
        html.push('</code></pre>');
        inCode = false;
      } else {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push('<pre style="background:var(--secondary);border-radius:8px;padding:12px 16px;overflow-x:auto;margin:12px 0;font-size:13px;line-height:1.6"><code>');
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      html.push(line.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      continue;
    }

    if (line.startsWith('# ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h1 style="font-size:1.8rem;font-weight:700;margin:24px 0 12px;letter-spacing:-0.03em">${line.slice(2)}</h1>`);
    } else if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2 style="font-size:1.4rem;font-weight:700;margin:20px 0 10px;letter-spacing:-0.02em">${line.slice(3)}</h2>`);
    } else if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3 style="font-size:1.1rem;font-weight:600;margin:16px 0 8px">${line.slice(4)}</h3>`);
    } else if (line.startsWith('> ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<blockquote style="border-left:3px solid var(--primary);margin:8px 0;padding:6px 16px;color:var(--muted-foreground);font-style:italic">${inlineFormat(line.slice(2))}</blockquote>`);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      if (!inList) { html.push('<ul style="list-style:none;padding:0;margin:8px 0">'); inList = true; }
      html.push(`<li style="display:flex;align-items:flex-start;gap:8px;padding:3px 0;font-size:14px"><span style="color:var(--primary);margin-top:5px;flex-shrink:0">•</span><span>${inlineFormat(line.slice(2))}</span></li>`);
    } else if (/^\d+\. /.test(line)) {
      if (inList) { html.push('</ul>'); inList = false; }
      const match = line.match(/^(\d+)\. (.+)/);
      if (match) {
        html.push(`<p style="display:flex;gap:8px;margin:4px 0;font-size:14px"><span style="color:var(--primary);font-weight:700;min-width:20px">${match[1]}.</span><span>${inlineFormat(match[2])}</span></p>`);
      }
    } else if (line === '---' || line === '***') {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<hr style="border:none;border-top:1px solid var(--border);margin:16px 0" />');
    } else if (line.trim() === '') {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<p style="margin:6px 0"></p>');
    } else {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<p style="margin:4px 0;line-height:1.7;font-size:14px">${inlineFormat(line)}</p>`);
    }
  }

  if (inList) html.push('</ul>');
  if (inCode) html.push('</code></pre>');

  return html.join('\n');
};

const inlineFormat = (text: string): string => {
  return text
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--secondary);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>');
};

export const DocsView = ({ meetings }: DocsViewProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(meetings[0]?.id || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('전체');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: true }), {})
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [editorContent, setEditorContent] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedMeeting = meetings.find(m => m.id === selectedId) || null;

  useEffect(() => {
    if (selectedMeeting) {
      setTitleValue(selectedMeeting.title || '');
      setTitleEdit(false);
      // Convert content to string
      let content = '';
      if (typeof selectedMeeting.content === 'string') {
        content = selectedMeeting.content;
      } else if (Array.isArray(selectedMeeting.content)) {
        // BlockNote JSON to markdown-like text
        content = selectedMeeting.content.map((block: any) => {
          if (!block) return '';
          const text = Array.isArray(block.content)
            ? block.content.map((c: any) => c?.text || '').join('')
            : '';
          switch (block.type) {
            case 'heading': return `${'#'.repeat(block.props?.level || 1)} ${text}`;
            case 'bulletListItem': return `- ${text}`;
            case 'numberedListItem': return `1. ${text}`;
            default: return text;
          }
        }).filter((t: string) => t.trim()).join('\n');
      } else if (selectedMeeting.content) {
        content = JSON.stringify(selectedMeeting.content, null, 2);
      }
      setEditorContent(content);
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

  const handleContentChange = (value: string) => {
    setEditorContent(value);
    // Debounced auto-save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!selectedMeeting) return;
      setSaving(true);
      try {
        const { error } = await supabase.from('meetings').update({ content: value }).eq('id', selectedMeeting.id);
        if (!error) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } finally {
        setSaving(false);
      }
    }, 1500);
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
      const session = JSON.parse(localStorage.getItem('hallaon_session') || '{}');
      const { data, error } = await supabase
        .from('meetings')
        .insert([{
          title: '제목 없는 문서',
          content: '',
          date: new Date().toISOString().split('T')[0],
          category: CATEGORIES[0],
          author_id: session?.user?.name || 'anonymous',
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
    <div className="animate-fade-in" style={{ display: 'flex', height: 'calc(100vh - 180px)', minHeight: 600 }}>
      {/* Sidebar */}
      <div style={{
        width: 240, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--sidebar)', borderRadius: '12px 0 0 12px',
      }}>
        {/* Search & New */}
        <div style={{ padding: '12px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="문서 검색..."
              className="notion-input"
              style={{ paddingLeft: 28, fontSize: 12 }}
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
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: filterCategory === cat ? 'var(--primary)' : 'var(--secondary)',
                  color: filterCategory === cat ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                  transition: 'all 0.1s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Folder Tree */}
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
          {CATEGORIES.filter(cat => filterCategory === '전체' || filterCategory === cat).map(cat => {
            const catMeetings = groupedMeetings[cat] || [];
            if (catMeetings.length === 0 && searchQuery) return null;
            const isExpanded = expandedFolders[cat];
            const catColor = CATEGORY_COLORS[cat] || 'var(--primary)';
            return (
              <div key={cat}>
                <button
                  onClick={() => toggleFolder(cat)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)',
                    textAlign: 'left', fontFamily: 'inherit',
                  }}
                >
                  {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <span style={{ color: catColor }}>{CATEGORY_EMOJI[cat]}</span>
                  <span style={{ flex: 1 }}>{cat}</span>
                  <span style={{
                    fontSize: 10, background: 'var(--secondary)', borderRadius: 99,
                    padding: '0 5px', color: 'var(--muted-foreground)', minWidth: 18, textAlign: 'center',
                  }}>
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
                        cursor: 'pointer', fontSize: 12, textAlign: 'left', fontFamily: 'inherit',
                        color: selectedId === m.id ? 'var(--foreground)' : 'var(--muted-foreground)',
                        fontWeight: selectedId === m.id ? 500 : 400,
                      }}
                    >
                      <FileText size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.title || '제목 없음'}
                      </span>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(m.id); }}
                      className="hover-actions"
                      style={{
                        position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 3, borderRadius: 4, color: 'var(--muted-foreground)',
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Empty state */}
          {meetings.length === 0 && !searchQuery && (
            <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 12 }}>
              문서가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* Main editor area */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--card)', borderRadius: '0 12px 12px 0',
        border: '1px solid var(--border)', borderLeft: 'none',
      }}>
        {selectedMeeting ? (
          <>
            {/* Document Header */}
            <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              {/* Title */}
              {titleEdit ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input
                    value={titleValue}
                    onChange={e => setTitleValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setTitleEdit(false); }}
                    className="notion-input"
                    style={{
                      fontSize: 20, fontWeight: 700, border: 'none',
                      borderBottom: '2px solid var(--primary)', borderRadius: 0,
                      padding: '2px 0', background: 'transparent', flex: 1,
                    }}
                    autoFocus
                  />
                  <button onClick={handleTitleSave} className="notion-btn-primary" style={{ fontSize: 12, padding: '4px 10px' }}>저장</button>
                  <button onClick={() => setTitleEdit(false)} className="notion-btn-ghost" style={{ padding: '4px 6px' }}><X size={14} /></button>
                </div>
              ) : (
                <div
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <h2
                    onClick={() => setTitleEdit(true)}
                    style={{
                      fontSize: 20, fontWeight: 700, cursor: 'text', margin: 0,
                      color: 'var(--foreground)', letterSpacing: '-0.02em', flex: 1, lineHeight: 1.3,
                    }}
                    title="클릭하여 제목 편집"
                  >
                    {selectedMeeting.title || '제목 없음'}
                  </h2>
                  <button
                    onClick={() => setTitleEdit(true)}
                    style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', flexShrink: 0, marginTop: 2 }}
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              )}

              {/* Meta + Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted-foreground)' }}>
                  <Clock size={11} />
                  {selectedMeeting.date
                    ? new Date(selectedMeeting.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '-'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
                  <span>분류:</span>
                  <select
                    value={selectedMeeting.category || ''}
                    onChange={e => handleCategoryChange(e.target.value)}
                    style={{
                      background: 'var(--secondary)', border: 'none', outline: 'none',
                      borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 600,
                      color: 'var(--foreground)', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{CATEGORY_EMOJI[cat]} {cat}</option>)}
                  </select>
                </div>
                <div style={{ fontSize: 12, color: saving ? 'var(--muted-foreground)' : saved ? '#37B24D' : 'transparent', marginLeft: 'auto' }}>
                  {saving ? '저장 중...' : saved ? '✓ 저장됨' : ''}
                </div>
                {/* Edit / Preview toggle */}
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                  <button
                    onClick={() => setViewMode('edit')}
                    style={{
                      padding: '3px 10px', fontSize: 11, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                      background: viewMode === 'edit' ? 'var(--primary)' : 'transparent',
                      color: viewMode === 'edit' ? '#fff' : 'var(--muted-foreground)',
                    }}
                  >
                    <Edit3 size={11} /> 편집
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    style={{
                      padding: '3px 10px', fontSize: 11, border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
                      background: viewMode === 'preview' ? 'var(--primary)' : 'transparent',
                      color: viewMode === 'preview' ? '#fff' : 'var(--muted-foreground)',
                    }}
                  >
                    <Eye size={11} /> 미리보기
                  </button>
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {viewMode === 'edit' ? (
                <div style={{ padding: '16px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Toolbar hints */}
                  <div style={{
                    display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap',
                    fontSize: 11, color: 'var(--muted-foreground)',
                    padding: '6px 10px', background: 'var(--secondary)', borderRadius: 6, alignItems: 'center',
                  }}>
                    <span style={{ fontWeight: 600, flexShrink: 0 }}>📝 마크다운:</span>
                    {['# 제목', '**굵게**', '*기울임*', '`코드`', '- 목록', '> 인용', '---'].map(item => (
                      <span
                        key={item}
                        style={{
                          background: 'var(--card)', padding: '1px 5px', borderRadius: 3,
                          border: '1px solid var(--border)', fontFamily: 'monospace',
                          cursor: 'pointer', transition: 'background 0.1s',
                        }}
                        onClick={() => {
                          const ta = document.getElementById('doc-editor') as HTMLTextAreaElement;
                          if (!ta) return;
                          const s = ta.selectionStart;
                          const newVal = ta.value.substring(0, s) + item + ta.value.substring(ta.selectionEnd);
                          ta.value = newVal;
                          ta.selectionStart = ta.selectionEnd = s + item.length;
                          ta.focus();
                          handleContentChange(newVal);
                        }}
                      >{item}</span>
                    ))}
                  </div>
                  <textarea
                    id="doc-editor"
                    value={editorContent}
                    onChange={e => handleContentChange(e.target.value)}
                    placeholder="여기에 내용을 작성하세요...&#10;&#10;마크다운 문법 사용 가능:&#10;# 큰 제목&#10;## 중간 제목&#10;**굵게** *기울임*&#10;- 목록 항목&#10;> 인용문&#10;`인라인 코드`"
                    style={{
                      flex: 1, minHeight: 400, resize: 'none',
                      border: 'none', outline: 'none',
                      background: 'transparent', color: 'var(--foreground)',
                      fontSize: 14, lineHeight: 1.8,
                      fontFamily: '"Inter", -apple-system, monospace',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{ padding: '16px 32px', lineHeight: 1.7 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(editorContent) }}
                />
              )}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted-foreground)', gap: 12,
          }}>
            <FileText size={40} style={{ opacity: 0.15 }} />
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
                style={{
                  background: '#E03E3E', color: '#fff', border: 'none',
                  borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
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
