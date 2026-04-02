/**
 * Command Palette (Ctrl+K / Cmd+K)
 * Global search across tasks, agendas, meetings + quick navigation
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ListTodo, ClipboardList, BookOpen, BarChart2,
  Calendar, Scale, HardDrive, Home, LayoutDashboard, X,
  ArrowRight, Hash
} from 'lucide-react';
import { useAppContext } from '../App';
import { cn } from '../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

interface SearchResult {
  id: string;
  type: 'page' | 'task' | 'agenda' | 'meeting';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
}

const PAGES: SearchResult[] = [
  { id: 'nav-home', type: 'page', title: '홈 · 가이드', icon: <Home size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-dashboard', type: 'page', title: '대시보드', icon: <BarChart2 size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-tasks', type: 'page', title: '업무 및 WBS', icon: <ListTodo size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-gantt', type: 'page', title: '간트 차트', icon: <LayoutDashboard size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-calendar', type: 'page', title: '캘린더', icon: <Calendar size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-agendas', type: 'page', title: '안건', icon: <ClipboardList size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-decisions', type: 'page', title: '의사결정', icon: <Scale size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-docs', type: 'page', title: '문서 허브', icon: <BookOpen size={16} />, subtitle: '페이지', action: () => {} },
  { id: 'nav-drive', type: 'page', title: '자료실', icon: <HardDrive size={16} />, subtitle: '페이지', action: () => {} },
];

const PAGE_TAB_MAP: Record<string, string> = {
  'nav-home': 'home',
  'nav-dashboard': 'dashboard',
  'nav-tasks': 'tasks',
  'nav-gantt': 'gantt',
  'nav-calendar': 'calendar',
  'nav-agendas': 'agendas',
  'nav-decisions': 'decisions',
  'nav-docs': 'docs',
  'nav-drive': 'drive',
};

export const CommandPalette = ({ isOpen, onClose, onNavigate }: CommandPaletteProps) => {
  const { tasks, agendas, meetings } = useAppContext();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build search results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items: SearchResult[] = [];

    // Pages
    const filteredPages = PAGES.filter(p =>
      !q || p.title.toLowerCase().includes(q)
    ).map(p => ({
      ...p,
      action: () => { onNavigate(PAGE_TAB_MAP[p.id] || 'home'); onClose(); },
    }));

    // Tasks
    const filteredTasks = tasks
      .filter(t => !q || t.title?.toLowerCase().includes(q) || t.wbs_code?.toLowerCase().includes(q) || t.assignee?.toLowerCase().includes(q))
      .slice(0, 8)
      .map(t => ({
        id: `task-${t.id}`,
        type: 'task' as const,
        title: t.title,
        subtitle: `${t.wbs_code || ''} · ${t.assignee || '미지정'} · ${t.status}`,
        icon: <ListTodo size={16} className="text-purple-500" />,
        action: () => { onNavigate('tasks'); onClose(); },
      }));

    // Agendas
    const filteredAgendas = agendas
      .filter(a => !q || a.title?.toLowerCase().includes(q) || a.proposer?.toLowerCase().includes(q))
      .slice(0, 5)
      .map(a => ({
        id: `agenda-${a.id}`,
        type: 'agenda' as const,
        title: a.title,
        subtitle: `${a.proposer || ''} · ${a.team} · ${a.status}`,
        icon: <ClipboardList size={16} className="text-blue-500" />,
        action: () => { onNavigate('agendas'); onClose(); },
      }));

    // Meetings/Docs
    const filteredMeetings = meetings
      .filter(m => !q || m.title?.toLowerCase().includes(q))
      .slice(0, 5)
      .map(m => ({
        id: `meeting-${m.id}`,
        type: 'meeting' as const,
        title: m.title,
        subtitle: `${m.category} · ${m.date}`,
        icon: <BookOpen size={16} className="text-green-500" />,
        action: () => { onNavigate('docs'); onClose(); },
      }));

    if (q) {
      items.push(...filteredPages, ...filteredTasks, ...filteredAgendas, ...filteredMeetings);
    } else {
      items.push(...filteredPages);
    }

    return items;
  }, [query, tasks, agendas, meetings, onNavigate, onClose]);

  // Reset index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-[560px] mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="페이지, 업무, 안건, 문서 검색..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-secondary text-[10px] text-muted-foreground font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다
              </div>
            ) : (
              results.map((result, i) => (
                <div
                  key={result.id}
                  onClick={result.action}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                    i === selectedIndex ? "bg-secondary" : "hover:bg-secondary/50"
                  )}
                >
                  <div className="shrink-0 w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-[11px] text-muted-foreground truncate">{result.subtitle}</div>
                    )}
                  </div>
                  {i === selectedIndex && (
                    <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-secondary font-mono">↑↓</kbd> 이동</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-secondary font-mono">Enter</kbd> 선택</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded border border-border bg-secondary font-mono">Esc</kbd> 닫기</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
