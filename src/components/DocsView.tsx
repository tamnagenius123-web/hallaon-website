/**
 * DocsView — Semi-Notion 문서 허브
 * ContentEditable 기반 풀 블록 에디터 (슬래시 커맨드 포함)
 * Supabase meetings 테이블 완전 호환
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Meeting } from '../types';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import {
  Plus, Trash2, X, ChevronRight, ChevronDown, FileText, Clock,
  Search, BookOpen, Save, Image, Folder, FolderOpen, MoreHorizontal,
  Bold, Italic, List, Hash, Quote, Code, CheckSquare, Minus, AlignLeft,
} from 'lucide-react';
import { TEAM_OPTIONS as ORG_TEAMS, TEAM_COLORS as ORG_COLORS } from '../lib/orgChart';

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

const DOC_EMOJIS = ['📋','📄','📝','📌','📎','📊','📈','💡','🔖','🗒️','📰','📓','📔','📒','📃','🗃️','📑','🔍','✅','⭐'];

// ─── 슬래시 커맨드 정의 ───────────────────────────────────────────────
const SLASH_COMMANDS = [
  { id: 'h1',        label: '제목 1',       icon: '# ',   description: '큰 제목',      insert: '# '       },
  { id: 'h2',        label: '제목 2',       icon: '## ',  description: '중간 제목',    insert: '## '      },
  { id: 'h3',        label: '제목 3',       icon: '### ', description: '작은 제목',    insert: '### '     },
  { id: 'bullet',    label: '글머리 목록',  icon: '• ',   description: '불릿 목록',    insert: '- '       },
  { id: 'numbered',  label: '번호 목록',    icon: '1.',   description: '번호 목록',    insert: '1. '      },
  { id: 'todo',      label: '할 일',        icon: '☐',    description: '체크리스트',   insert: '- [ ] '   },
  { id: 'quote',     label: '인용',         icon: '"',    description: '인용문',       insert: '> '       },
  { id: 'code',      label: '코드 블록',    icon: '</>',  description: '코드 블록',    insert: '```\n\n```'},
  { id: 'divider',   label: '구분선',       icon: '—',    description: '수평선',       insert: '---'      },
  { id: 'meeting',   label: '회의록 템플릿', icon: '📋',  description: '회의록 양식',
    insert: `# 회의 제목\n\n**일시:** ${new Date().toLocaleDateString('ko-KR')}\n**참석자:** \n\n---\n\n## 안건\n\n- \n\n## 논의 내용\n\n\n## 결정 사항\n\n\n## 다음 액션\n\n- [ ] `
  },
];

// ─── 마크다운 → HTML 렌더러 ──────────────────────────────────────────
function renderMarkdown(text: string): string {
  if (!text) return '<p style="color:var(--muted-foreground);font-style:italic">내용이 없습니다</p>';

  const escape = (s: string) =>
    s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const inlineFormat = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--secondary);padding:1px 5px;border-radius:4px;font-size:0.9em">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer" style="color:var(--primary);text-decoration:underline">$1</a>');

  const lines = text.split('\n');
  const out: string[] = [];
  let inCode = false;
  let inUl = false, inOl = false, inTodo = false;

  const closeList = () => {
    if (inUl)   { out.push('</ul>'); inUl = false; }
    if (inOl)   { out.push('</ol>'); inOl = false; }
    if (inTodo) { out.push('</ul>'); inTodo = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 코드 블록
    if (line.startsWith('```')) {
      if (inCode) { out.push('</code></pre>'); inCode = false; }
      else { closeList(); out.push(`<pre style="background:var(--secondary);border:1px solid var(--border);border-radius:8px;padding:14px 16px;overflow-x:auto;margin:12px 0;font-size:13px;line-height:1.6"><code>`); inCode = true; }
      continue;
    }
    if (inCode) { out.push(escape(line)); continue; }

    // 수평선
    if (line.match(/^[-*_]{3,}$/)) { closeList(); out.push('<hr style="border:none;border-top:1px solid var(--border);margin:20px 0">'); continue; }

    // 제목
    const hMatch = line.match(/^(#{1,3})\s(.+)/);
    if (hMatch) {
      closeList();
      const level = hMatch[1].length;
      const sizes = ['1.75rem','1.35rem','1.1rem'];
      const weights = ['800','700','600'];
      out.push(`<h${level} style="font-size:${sizes[level-1]};font-weight:${weights[level-1]};margin:${level===1?'28':'20'}px 0 10px;letter-spacing:-0.03em;line-height:1.25">${inlineFormat(escape(hMatch[2]))}</h${level}>`);
      continue;
    }

    // 인용
    if (line.startsWith('> ')) {
      closeList();
      out.push(`<blockquote style="border-left:3px solid var(--primary);margin:12px 0;padding:8px 14px;background:var(--secondary);border-radius:0 6px 6px 0;color:var(--muted-foreground);font-style:italic">${inlineFormat(escape(line.slice(2)))}</blockquote>`);
      continue;
    }

    // 체크리스트
    const todoMatch = line.match(/^- \[(x| )\] (.+)/i);
    if (todoMatch) {
      if (!inTodo) { closeList(); out.push('<ul style="list-style:none;padding-left:0;margin:6px 0">'); inTodo = true; }
      const checked = todoMatch[1].toLowerCase() === 'x';
      out.push(`<li style="display:flex;align-items:flex-start;gap:8px;padding:3px 0"><input type="checkbox" ${checked?'checked':''} disabled style="margin-top:3px;accent-color:var(--primary)"><span style="${checked?'text-decoration:line-through;color:var(--muted-foreground)':''}">${inlineFormat(escape(todoMatch[2]))}</span></li>`);
      continue;
    }

    // 불릿 목록
    const ulMatch = line.match(/^- (.+)/);
    if (ulMatch) {
      if (!inUl) { closeList(); out.push('<ul style="padding-left:20px;margin:6px 0">'); inUl = true; }
      out.push(`<li style="margin:3px 0">${inlineFormat(escape(ulMatch[1]))}</li>`);
      continue;
    }

    // 번호 목록
    const olMatch = line.match(/^\d+\. (.+)/);
    if (olMatch) {
      if (!inOl) { closeList(); out.push('<ol style="padding-left:20px;margin:6px 0">'); inOl = true; }
      out.push(`<li style="margin:3px 0">${inlineFormat(escape(olMatch[1]))}</li>`);
      continue;
    }

    closeList();

    // 빈 줄
    if (!line.trim()) { out.push('<br>'); continue; }

    out.push(`<p style="margin:4px 0;line-height:1.7">${inlineFormat(escape(line))}</p>`);
  }
  closeList();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

// ─── 이모지 선택기 ───────────────────────────────────────────────────
const EmojiPicker = ({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) => (
  <div onClick={e => e.stopPropagation()}
    style={{
      position: 'absolute', zIndex: 100, background: 'var(--card)',
      border: '1px solid var(--border)', borderRadius: 12, padding: 10,
      boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4,
      top: '110%', left: 0, minWidth: 180,
    }}
  >
    {DOC_EMOJIS.map(e => (
      <button key={e} onClick={() => { onSelect(e); onClose(); }}
        style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 5, borderRadius: 6, lineHeight: 1 }}
        onMouseEnter={el => (el.currentTarget.style.background = 'var(--secondary)')}
        onMouseLeave={el => (el.currentTarget.style.background = 'none')}
      >{e}</button>
    ))}
  </div>
);

// ─── 커버 선택기 ────────────────────────────────────────────────────
const CoverPicker = ({ onSelect, onClose }: { onSelect: (g: string) => void; onClose: () => void }) => (
  <div onClick={e => e.stopPropagation()}
    style={{
      position: 'absolute', zIndex: 100, background: 'var(--card)',
      border: '1px solid var(--border)', borderRadius: 12, padding: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
      display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6,
      top: '110%', left: 0, minWidth: 270,
    }}
  >
    <button onClick={() => { onSelect(''); onClose(); }}
      style={{ gridColumn: '1/-1', fontSize: 12, color: 'var(--muted-foreground)', background: 'var(--secondary)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', marginBottom: 4 }}>
      커버 제거
    </button>
    {COVER_GRADIENTS.map((g, i) => (
      <button key={i} onClick={() => { onSelect(g); onClose(); }}
        style={{ width: 44, height: 28, borderRadius: 6, background: g, border: 'none', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', outline: 'none' }}
      />
    ))}
  </div>
);

// ─── 인라인 마크다운 에디터 (슬래시 커맨드 지원) ──────────────────
const MarkdownEditor = ({
  value,
  onChange,
  docId,
}: {
  value: string;
  onChange: (v: string) => void;
  docId: string;
}) => {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashStart, setSlashStart] = useState(-1);
  const [slashIdx, setSlashIdx] = useState(0);

  const filtered = useMemo(() =>
    SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashFilter.toLowerCase()) || c.description.toLowerCase().includes(slashFilter.toLowerCase())),
    [slashFilter]
  );

  const insertCommand = useCallback((cmd: typeof SLASH_COMMANDS[0]) => {
    const ta = taRef.current;
    if (!ta) return;
    const cur = ta.selectionStart;
    const before = value.slice(0, slashStart);
    const after = value.slice(cur);
    const newVal = before + cmd.insert + after;
    onChange(newVal);
    setShowSlash(false);
    setSlashStart(-1);
    // 커서 위치 조정
    setTimeout(() => {
      const newCur = before.length + cmd.insert.length;
      ta.setSelectionRange(newCur, newCur);
      ta.focus();
    }, 10);
  }, [value, slashStart, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlash) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && filtered[slashIdx]) { e.preventDefault(); insertCommand(filtered[slashIdx]); return; }
      if (e.key === 'Escape') { setShowSlash(false); return; }
    }

    // Tab → 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = value.slice(0, start) + '  ' + value.slice(end);
      onChange(newVal);
      setTimeout(() => ta.setSelectionRange(start + 2, start + 2), 0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    const cur = e.target.selectionStart;
    const lineStart = newVal.lastIndexOf('\n', cur - 1) + 1;
    const lineText = newVal.slice(lineStart, cur);

    if (lineText.startsWith('/')) {
      const filter = lineText.slice(1);
      setSlashFilter(filter);
      setSlashStart(lineStart);
      setSlashIdx(0);

      // 슬래시 메뉴 위치 계산
      const ta = taRef.current;
      if (ta) {
        const lines = newVal.slice(0, cur).split('\n');
        const lineNum = lines.length - 1;
        const lineH = 24; // 줄 높이 근사값
        setSlashPos({ top: (lineNum + 1) * lineH + 4, left: 8 });
      }
      setShowSlash(true);
    } else {
      setShowSlash(false);
      setSlashStart(-1);
    }
  };

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <textarea
        ref={taRef}
        key={docId}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={() => setShowSlash(false)}
        placeholder="내용을 입력하세요... ( / 로 블록 삽입)"
        style={{
          width: '100%', height: '100%', minHeight: 400,
          border: 'none', outline: 'none', resize: 'none',
          background: 'transparent', color: 'var(--foreground)',
          fontSize: 15, lineHeight: 1.75, fontFamily: 'inherit',
          padding: 0, boxSizing: 'border-box',
        }}
        spellCheck={false}
      />

      {/* 슬래시 커맨드 드롭다운 */}
      {showSlash && filtered.length > 0 && (
        <div style={{
          position: 'absolute', left: slashPos.left, top: slashPos.top,
          zIndex: 50, background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          minWidth: 220, maxHeight: 280, overflowY: 'auto',
          padding: 4,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-foreground)', padding: '4px 8px 2px', letterSpacing: '0.08em' }}>
            블록 삽입
          </div>
          {filtered.map((cmd, idx) => (
            <div
              key={cmd.id}
              onClick={() => insertCommand(cmd)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                background: idx === slashIdx ? 'var(--secondary)' : 'none',
              }}
              onMouseEnter={() => setSlashIdx(idx)}
            >
              <span style={{ fontSize: 14, width: 22, textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{cmd.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{cmd.label}</div>
                <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{cmd.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 메인 DocsView ──────────────────────────────────────────────────
export const DocsView = ({ meetings: initialMeetings }: DocsViewProps) => {
  const { optimisticAddMeeting, optimisticUpdateMeeting, optimisticDeleteMeeting } = useAppContext();

  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('전체 회의');
  const [search, setSearch] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORIES));

  // New doc form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({ title: '새 문서', category: '전체 회의', emoji: '📄', cover: '' });
  const [creating, setCreating] = useState(false);

  // Picker states (new doc modal)
  const [showNewEmoji, setShowNewEmoji] = useState(false);
  const [showNewCover, setShowNewCover] = useState(false);

  // Editor picker states (doc page)
  const [showDocEmoji, setShowDocEmoji] = useState(false);
  const [showDocCover, setShowDocCover] = useState(false);

  // Editor text content — key로 selectedId를 사용해 doc 전환 시 완전 리셋
  const [editorText, setEditorText] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // initialMeetings 동기
  useEffect(() => { setMeetings(initialMeetings); }, [initialMeetings]);

  const selectedMeeting = useMemo(() => meetings.find(m => m.id === selectedId) ?? null, [meetings, selectedId]);

  // doc 전환 시 에디터 텍스트 로드 (selectedId 변경 시만)
  useEffect(() => {
    if (!selectedMeeting) { setEditorText(''); return; }
    const raw = selectedMeeting.content;
    if (typeof raw === 'string') {
      setEditorText(raw);
    } else if (Array.isArray(raw)) {
      // 배열 형식(blocknote 레거시) → 텍스트 추출
      const texts = raw.map((b: any) => {
        const content = b.content ?? [];
        const text = Array.isArray(content)
          ? content.map((c: any) => c.text ?? '').join('')
          : '';
        if (b.type === 'heading') return `${'#'.repeat(b.props?.level ?? 1)} ${text}`;
        if (b.type === 'bulletListItem') return `- ${text}`;
        if (b.type === 'numberedListItem') return `1. ${text}`;
        if (b.type === 'checkListItem') return `- [${b.props?.checked ? 'x' : ' '}] ${text}`;
        if (b.type === 'quote') return `> ${text}`;
        if (b.type === 'codeBlock') return `\`\`\`\n${text}\n\`\`\``;
        return text;
      });
      setEditorText(texts.join('\n'));
    } else if (raw && typeof raw === 'object' && (raw as any).markdown) {
      setEditorText((raw as any).markdown);
    } else {
      setEditorText('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // 자동 저장 (debounce 1.5s)
  const handleEditorChange = useCallback((text: string) => {
    setEditorText(text);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!selectedId) return;
      await supabase.from('meetings').update({ content: text }).eq('id', selectedId);
      optimisticUpdateMeeting(selectedId, { content: text });
      setSavedAt(new Date());
    }, 1500);
  }, [selectedId, optimisticUpdateMeeting]);

  // 메타 업데이트 (제목/이모지/커버)
  const handleMetaUpdate = useCallback(async (patch: Record<string, any>) => {
    if (!selectedId) return;
    setMeetings(prev => prev.map(m => m.id === selectedId ? { ...m, ...patch } : m));
    optimisticUpdateMeeting(selectedId, patch);
    await supabase.from('meetings').update(patch).eq('id', selectedId);
  }, [selectedId, optimisticUpdateMeeting]);

  // 새 문서 생성
  const handleCreateDoc = async () => {
    if (creating) return;
    setCreating(true);
    const title = newForm.title.trim() || '새 문서';
    const payload = {
      category: newForm.category,
      date: new Date().toISOString().split('T')[0],
      title,
      author_id: 'user',
      content: `# ${title}\n\n내용을 입력하세요...`,
      emoji: newForm.emoji,
      cover: newForm.cover,
    };

    try {
      const { data, error } = await supabase.from('meetings').insert([payload]).select().single();
      if (error) throw error;
      if (data) {
        const newDoc = data as Meeting;
        setMeetings(prev => [newDoc, ...prev]);
        optimisticAddMeeting(newDoc);
        setSelectedId(newDoc.id);
        setShowNewForm(false);
        setNewForm({ title: '새 문서', category: '전체 회의', emoji: '📄', cover: '' });
      }
    } catch (err: any) {
      alert('문서 생성 오류: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setCreating(false);
    }
  };

  // 문서 삭제
  const handleDelete = async (id: string) => {
    if (!window.confirm('이 문서를 삭제하시겠습니까?')) return;
    setMeetings(prev => prev.filter(m => m.id !== id));
    optimisticDeleteMeeting(id);
    await supabase.from('meetings').delete().eq('id', id);
    if (selectedId === id) setSelectedId(null);
  };

  // 필터링
  const filtered = useMemo(() => meetings.filter(m => {
    const matchCat = filterCategory === '전체 회의' || m.category === filterCategory;
    const matchSearch = !search || m.title?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }), [meetings, filterCategory, search]);

  // 카테고리별 그룹
  const grouped = useMemo(() => {
    const g: Record<string, Meeting[]> = {};
    CATEGORIES.slice(1).forEach(cat => { g[cat] = filtered.filter(m => m.category === cat); });
    return g;
  }, [filtered]);

  const visibleCats = filterCategory === '전체 회의' ? CATEGORIES.slice(1) : [filterCategory];

  const toggleCat = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const getMeta = (m: Meeting) => ({
    emoji: (m as any).emoji || '📄',
    cover: (m as any).cover || '',
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', overflow: 'hidden' }}>

      {/* ─── 좌측 사이드바 ─────────────────────────────────────────── */}
      <div style={{
        width: 255, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: 'var(--card)',
      }}>
        {/* 헤더 */}
        <div style={{ padding: '14px 12px 8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={14} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>문서 허브</span>
            </div>
            <button onClick={() => setShowNewForm(true)}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none',
                borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
              }}>
              <Plus size={11} /> 새 문서
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="검색..." style={{
                width: '100%', padding: '5px 8px 5px 26px', boxSizing: 'border-box',
                background: 'var(--secondary)', border: '1px solid var(--border)',
                borderRadius: 6, fontSize: 12, color: 'var(--foreground)', outline: 'none',
              }} />
          </div>
        </div>

        {/* 카테고리 필터 탭 */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{
                fontSize: 10, fontWeight: 600, padding: '3px 7px', borderRadius: 12,
                border: 'none', cursor: 'pointer',
                background: filterCategory === cat ? (CATEGORY_COLORS[cat] || 'var(--primary)') : 'var(--secondary)',
                color: filterCategory === cat ? '#fff' : 'var(--muted-foreground)',
                transition: 'all 0.15s',
              }}>
              {CATEGORY_EMOJI[cat]} {cat}
            </button>
          ))}
        </div>

        {/* 트리 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 4px' }}>
          {visibleCats.map(cat => {
            const docs = grouped[cat] ?? [];
            if (filterCategory !== '전체 회의' && docs.length === 0) return null;
            const expanded = expandedCategories.has(cat);
            return (
              <div key={cat} style={{ marginBottom: 2 }}>
                <button onClick={() => toggleCat(cat)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 6px', borderRadius: 6, border: 'none',
                    background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)',
                  }}>
                  {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {CATEGORY_EMOJI[cat]} {cat}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--secondary)', borderRadius: 10, padding: '1px 5px' }}>
                    {docs.length}
                  </span>
                </button>

                {expanded && docs.map(doc => {
                  const { emoji } = getMeta(doc);
                  const isActive = doc.id === selectedId;
                  return (
                    <div key={doc.id} onClick={() => setSelectedId(doc.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 6px 5px 20px', borderRadius: 6,
                        cursor: 'pointer', marginBottom: 1,
                        background: isActive ? 'var(--primary)' : 'transparent',
                        color: isActive ? '#fff' : 'var(--foreground)',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--secondary)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>
                        {doc.title}
                      </span>
                      <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0, color: isActive ? '#fff' : 'var(--muted-foreground)', flexShrink: 0 }}
                        className="doc-delete-btn">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}

                {expanded && docs.length === 0 && (
                  <div style={{ padding: '3px 20px', fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>문서 없음</div>
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
            {/* 커버 */}
            {getMeta(selectedMeeting).cover && (
              <div style={{ height: 140, background: getMeta(selectedMeeting).cover, flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button onClick={() => setShowDocCover(p => !p)}
                    style={{ position: 'absolute', bottom: 10, right: 14, background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Image size={11} /> 커버 변경
                  </button>
                  {showDocCover && (
                    <CoverPicker
                      onSelect={cover => { handleMetaUpdate({ cover }); setShowDocCover(false); }}
                      onClose={() => setShowDocCover(false)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 문서 헤더 */}
            <div style={{ padding: '18px 48px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' }}>
                {/* 이모지 버튼 */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowDocEmoji(p => !p)}
                    style={{ fontSize: 30, background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
                    {getMeta(selectedMeeting).emoji}
                  </button>
                  {showDocEmoji && (
                    <EmojiPicker
                      onSelect={emoji => { handleMetaUpdate({ emoji }); setShowDocEmoji(false); }}
                      onClose={() => setShowDocEmoji(false)}
                    />
                  )}
                </div>

                {/* 커버 없을 때 추가 버튼 */}
                {!getMeta(selectedMeeting).cover && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowDocCover(p => !p)}
                      style={{ fontSize: 11, color: 'var(--muted-foreground)', background: 'var(--secondary)', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Image size={11} /> 커버
                    </button>
                    {showDocCover && (
                      <CoverPicker
                        onSelect={cover => { handleMetaUpdate({ cover }); setShowDocCover(false); }}
                        onClose={() => setShowDocCover(false)}
                      />
                    )}
                  </div>
                )}

                {/* 미리보기 / 편집 토글 */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {savedAt && (
                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Save size={11} /> {savedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장
                    </span>
                  )}
                  <button onClick={() => setIsPreview(p => !p)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: isPreview ? 'var(--primary)' : 'var(--secondary)', color: isPreview ? '#fff' : 'var(--foreground)', cursor: 'pointer' }}>
                    {isPreview ? '✏️ 편집' : '👁 미리보기'}
                  </button>
                </div>
              </div>

              {/* 제목 인라인 편집 */}
              <input
                value={selectedMeeting.title}
                onChange={e => handleMetaUpdate({ title: e.target.value })}
                style={{
                  width: '100%', fontSize: 28, fontWeight: 800,
                  border: 'none', outline: 'none', background: 'transparent',
                  color: 'var(--foreground)', letterSpacing: '-0.04em',
                  padding: '0 0 8px', boxSizing: 'border-box', lineHeight: 1.25,
                }}
                placeholder="제목 없음"
              />

              {/* 메타 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  background: `${CATEGORY_COLORS[selectedMeeting.category] || '#868E96'}20`,
                  color: CATEGORY_COLORS[selectedMeeting.category] || '#868E96',
                  padding: '2px 8px', borderRadius: 12,
                }}>
                  {CATEGORY_EMOJI[selectedMeeting.category]} {selectedMeeting.category}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} /> {selectedMeeting.date}
                </span>
              </div>
            </div>

            {/* 에디터 or 프리뷰 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 48px 48px' }}>
              {isPreview ? (
                <div
                  style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--foreground)' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(editorText) }}
                />
              ) : (
                <MarkdownEditor
                  key={selectedId!}
                  value={editorText}
                  onChange={handleEditorChange}
                  docId={selectedId!}
                />
              )}
            </div>
          </>
        ) : (
          /* 빈 상태 */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)' }}>
            <BookOpen size={48} style={{ marginBottom: 16, opacity: 0.25 }} />
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>문서를 선택하거나 새로 만드세요</div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>좌측에서 문서를 클릭하거나 + 버튼을 누르세요</div>
            <button onClick={() => setShowNewForm(true)}
              style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> 새 문서 만들기
            </button>
          </div>
        )}
      </div>

      {/* ─── 새 문서 모달 ─────────────────────────────────────────── */}
      {showNewForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => !creating && setShowNewForm(false)}>
          <div style={{ background: 'var(--card)', borderRadius: 16, padding: 28, width: 400, maxWidth: '90vw', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>새 문서 만들기</h3>
              <button onClick={() => setShowNewForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <X size={18} />
              </button>
            </div>

            {/* 커버 미리보기 */}
            {newForm.cover && (
              <div style={{ height: 70, background: newForm.cover, borderRadius: 8, marginBottom: 12 }} />
            )}

            {/* 이모지 + 커버 버튼 */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setShowNewEmoji(p => !p); setShowNewCover(false); }}
                  style={{ fontSize: 26, background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>
                  {newForm.emoji}
                </button>
                {showNewEmoji && (
                  <EmojiPicker
                    onSelect={emoji => { setNewForm(p => ({ ...p, emoji })); setShowNewEmoji(false); }}
                    onClose={() => setShowNewEmoji(false)}
                  />
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setShowNewCover(p => !p); setShowNewEmoji(false); }}
                  style={{ fontSize: 12, background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Image size={13} /> 커버
                </button>
                {showNewCover && (
                  <CoverPicker
                    onSelect={cover => { setNewForm(p => ({ ...p, cover })); setShowNewCover(false); }}
                    onClose={() => setShowNewCover(false)}
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
                style={{ width: '100%', padding: '9px 12px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' }}
                onKeyDown={e => e.key === 'Enter' && handleCreateDoc()}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: 5 }}>카테고리</label>
              <select value={newForm.category} onChange={e => setNewForm(p => ({ ...p, category: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, color: 'var(--foreground)', outline: 'none' }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewForm(false)} disabled={creating}
                style={{ padding: '8px 16px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: 'var(--foreground)' }}>
                취소
              </button>
              <button onClick={handleCreateDoc} disabled={creating}
                style={{ padding: '8px 20px', background: creating ? 'var(--border)' : 'var(--primary)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {creating ? '생성 중...' : <><Plus size={14} /> 만들기</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .doc-delete-btn { opacity: 0 !important; transition: opacity 0.15s; }
        div:hover > .doc-delete-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
};
