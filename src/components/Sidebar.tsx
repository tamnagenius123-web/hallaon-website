import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, ListTodo, FileText, Calendar as CalendarIcon,
  LogOut, HardDrive, Scale, Sun, Moon, ClipboardList,
  ChevronDown, ChevronRight, Home, BarChart2, BookOpen,
  ChevronLeft, ChevronRightIcon, Plus, Search, Settings,
  Clock, Trash2, MoreHorizontal, Star, X, Columns3
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from 'next-themes';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenCommandPalette?: () => void;
}

interface NavItem {
  id: string;
  icon: any;
  label: string;
  subItems?: NavItem[];
}

interface RecentPage {
  id: string;
  tabId: string;
  label: string;
  timestamp: number;
}

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  {
    label: null,
    items: [
      { id: 'home', icon: Home, label: '홈 · 가이드' },
      { id: 'dashboard', icon: BarChart2, label: '대시보드' },
    ]
  },
  {
    label: '워크스페이스',
    items: [
      { 
        id: 'project-group', 
        icon: LayoutDashboard, 
        label: '프로젝트',
        subItems: [
          { id: 'tasks', icon: ListTodo, label: '업무 및 WBS' },
          { id: 'kanban', icon: Columns3, label: '칸반 보드' },
          { id: 'gantt', icon: LayoutDashboard, label: '간트 차트' },
          { id: 'calendar', icon: CalendarIcon, label: '캘린더' },
        ]
      },
      { 
        id: 'collab-group', 
        icon: ClipboardList, 
        label: '협업',
        subItems: [
          { id: 'agendas', icon: ClipboardList, label: '안건' },
          { id: 'decisions', icon: Scale, label: '의사결정' },
          { id: 'docs', icon: BookOpen, label: '문서 허브' },
          { id: 'drive', icon: HardDrive, label: '자료실' },
        ]
      }
    ]
  }
];

const TAB_LABELS: Record<string, string> = {
  home: '홈 · 가이드',
  dashboard: '대시보드',
  tasks: '업무 및 WBS',
  kanban: '칸반 보드',
  gantt: '간트 차트',
  calendar: '캘린더',
  agendas: '안건',
  decisions: '의사결정',
  docs: '문서 허브',
  drive: '자료실',
};

export const Sidebar = ({ activeTab, setActiveTab, onLogout, onOpenCommandPalette }: SidebarProps) => {
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['project-group', 'collab-group']));
  const [pwExpanded, setPwExpanded] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showRecent, setShowRecent] = useState(false);

  const session = JSON.parse(localStorage.getItem('hallaon_session') || '{}');
  const userName = session?.user?.name || '';

  // 최근 본 페이지 로직
  useEffect(() => {
    const stored = localStorage.getItem('hallaon_recent_pages');
    if (stored) setRecentPages(JSON.parse(stored));
    
    const stored_fav = localStorage.getItem('hallaon_favorites');
    if (stored_fav) setFavorites(new Set(JSON.parse(stored_fav)));
  }, []);

  useEffect(() => {
    if (activeTab && TAB_LABELS[activeTab]) {
      setRecentPages(prev => {
        const filtered = prev.filter(p => p.tabId !== activeTab);
        const newPage: RecentPage = {
          id: `${activeTab}-${Date.now()}`,
          tabId: activeTab,
          label: TAB_LABELS[activeTab],
          timestamp: Date.now()
        };
        const updated = [newPage, ...filtered].slice(0, 5);
        localStorage.setItem('hallaon_recent_pages', JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeTab]);

  const toggleFavorite = (tabId: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(tabId)) newFavs.delete(tabId);
    else newFavs.add(tabId);
    setFavorites(newFavs);
    localStorage.setItem('hallaon_favorites', JSON.stringify(Array.from(newFavs)));
  };

  const clearRecent = (id: string) => {
    setRecentPages(prev => prev.filter(p => p.id !== id));
    localStorage.setItem('hallaon_recent_pages', JSON.stringify(recentPages.filter(p => p.id !== id)));
  };

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedGroups);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedGroups(newSet);
  };

  const handlePwChange = async () => {
    if (!newPw || newPw !== newPw2) { setPwMsg('비밀번호를 확인하세요.'); return; }
    try {
      const { error } = await supabase.from('users').update({ password: newPw }).eq('name', userName);
      if (error) throw error;
      setPwMsg('변경 완료!');
      setNewPw(''); setNewPw2('');
      setTimeout(() => { setPwMsg(''); setPwExpanded(false); }, 2000);
    } catch { setPwMsg('변경 실패. 다시 시도하세요.'); }
  };

  return (
    <div 
      className="relative h-full flex shrink-0 transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 0 : 240 }}
      onMouseEnter={() => setIsHoveringSidebar(true)}
      onMouseLeave={() => setIsHoveringSidebar(false)}
    >
      {/* Sidebar Content */}
      <aside
        className={cn(
          "notion-sidebar w-[240px] transition-transform duration-300 ease-in-out",
          collapsed && "-translate-x-full"
        )}
      >
        {/* User Profile Header */}
        <div className="p-3 mb-2">
          <div 
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[var(--notion-hover)] cursor-pointer group"
            onClick={() => setPwExpanded(!pwExpanded)}
          >
            <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
              {userName?.[0] || 'U'}
            </div>
            <span className="text-sm font-semibold truncate flex-1">{userName}의 Workspace</span>
            <ChevronDown size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* Password Change Dropdown */}
          <AnimatePresence>
            {pwExpanded && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-2 p-3 bg-secondary rounded-lg border border-border shadow-sm"
              >
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">비밀번호 변경</div>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="새 비밀번호"
                  className="notion-input mb-1.5 text-xs h-8"
                />
                <input
                  type="password"
                  value={newPw2}
                  onChange={e => setNewPw2(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="notion-input mb-2 text-xs h-8"
                />
                {pwMsg && <div className={cn("text-[10px] mb-2 text-center", pwMsg.includes('완료') ? "text-green-500" : "text-red-500")}>{pwMsg}</div>}
                <button onClick={handlePwChange} className="notion-btn-primary w-full h-7 text-xs">변경하기</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search & Recent */}
        <div className="px-2 space-y-0.5 mb-4">
          <div className="sidebar-item group" onClick={() => onOpenCommandPalette?.()}>
            <Search size={16} />
            <span className="flex-1">검색</span>
            <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">Ctrl+K</span>
          </div>
          
          {/* 최근 본 페이지 */}
          <div 
            className="sidebar-item group"
            onClick={() => setShowRecent(!showRecent)}
          >
            <Clock size={16} />
            <span className="flex-1">최근 본 페이지</span>
            <ChevronRight size={14} className={cn("text-muted-foreground transition-transform", showRecent && "rotate-90")} />
          </div>

          {/* Recent Pages Dropdown */}
          <AnimatePresence>
            {showRecent && recentPages.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pl-4 space-y-0.5"
              >
                {recentPages.map(page => (
                  <div
                    key={page.id}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs rounded hover:bg-[var(--notion-hover)] cursor-pointer group transition-colors"
                    onClick={() => setActiveTab(page.tabId)}
                  >
                    <Clock size={12} className="text-muted-foreground opacity-60" />
                    <span className="flex-1 truncate text-muted-foreground">{page.label}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearRecent(page.id); }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-4">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx}>
              {group.label && (
                <div className="px-3 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <div key={item.id}>
                    <div
                      className={cn(
                        "sidebar-item group relative",
                        activeTab === item.id && "active bg-[var(--notion-hover)]"
                      )}
                      onClick={() => !item.subItems && setActiveTab(item.id)}
                    >
                      {item.subItems ? (
                        <button 
                          onClick={(e) => toggleGroup(item.id, e)}
                          className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
                        >
                          {expandedGroups.has(item.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <item.icon size={16} className="shrink-0" />
                      )}
                      {item.subItems && <item.icon size={16} className="shrink-0 ml-1" />}
                      <span className="flex-1 truncate">{item.label}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star size={14} className={cn("transition-colors", favorites.has(item.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                      </button>
                    </div>

                    {/* Sub Items (Tree Structure) */}
                    <AnimatePresence>
                      {item.subItems && expandedGroups.has(item.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          {item.subItems.map((sub) => (
                            <div
                              key={sub.id}
                              className={cn(
                                "sidebar-item pl-9 group",
                                activeTab === sub.id && "active bg-[var(--notion-hover)]"
                              )}
                              onClick={() => setActiveTab(sub.id)}
                            >
                              <sub.icon size={14} className="shrink-0 opacity-70" />
                              <span className="flex-1 truncate">{sub.label}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(sub.id); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Star size={12} className={cn("transition-colors", favorites.has(sub.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border mt-auto space-y-0.5">
          <div className="sidebar-item" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
          </div>
          <div className="sidebar-item text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={onLogout}>
            <LogOut size={16} />
            <span>로그아웃</span>
          </div>
        </div>

        {/* Collapse Button (Inside) */}
        <button 
          onClick={() => setCollapsed(true)}
          className={cn(
            "absolute right-2 top-4 p-1 rounded hover:bg-[var(--notion-hover)] text-muted-foreground opacity-0 transition-opacity duration-200",
            isHoveringSidebar && "opacity-100"
          )}
        >
          <ChevronLeft size={16} />
        </button>
      </aside>

      {/* Expand Button (When collapsed) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed left-2 top-4 z-50 p-1.5 bg-background border border-border rounded-md shadow-sm hover:bg-[var(--notion-hover)] text-muted-foreground transition-all duration-200"
        >
          <ChevronRightIcon size={18} />
        </button>
      )}
    </div>
  );
};
