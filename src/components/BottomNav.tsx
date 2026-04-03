/**
 * BottomNav - Mobile bottom tab navigation
 * Based on NNGroup mobile navigation patterns
 * 5 tabs: Today(Home), Tasks, Meetings(Agendas), Docs, More
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, ListTodo, ClipboardList, BookOpen, MoreHorizontal,
  BarChart2, LayoutDashboard, Calendar, Scale, HardDrive,
  Home, X, Settings, Moon, LogOut, Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from 'next-themes';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenCommandPalette?: () => void;
}

const MAIN_TABS = [
  { id: 'home', icon: Home, label: '오늘' },
  { id: 'tasks', icon: ListTodo, label: '업무' },
  { id: 'agendas', icon: ClipboardList, label: '회의' },
  { id: 'docs', icon: BookOpen, label: '문서' },
  { id: 'more', icon: MoreHorizontal, label: '더보기' },
];

const MORE_ITEMS = [
  { id: 'dashboard', icon: BarChart2, label: '대시보드' },
  { id: 'gantt', icon: LayoutDashboard, label: '간트 차트' },
  { id: 'calendar', icon: Calendar, label: '캘린더' },
  { id: 'decisions', icon: Scale, label: '의사결정' },
  { id: 'drive', icon: HardDrive, label: '자료실' },
];

export const BottomNav = ({ activeTab, setActiveTab, onLogout, onOpenCommandPalette }: BottomNavProps) => {
  const [showMore, setShowMore] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleTabClick = (id: string) => {
    if (id === 'more') {
      setShowMore(!showMore);
    } else {
      setActiveTab(id);
      setShowMore(false);
    }
  };

  const isActive = (id: string) => {
    if (id === 'more') return showMore;
    return activeTab === id;
  };

  // Check if current tab is in the "more" menu
  const isMoreActive = MORE_ITEMS.some(item => item.id === activeTab);

  return (
    <>
      {/* More Menu Sheet */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/30"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-[60px] left-0 right-0 z-[91] bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[60vh] overflow-y-auto"
            >
              <div className="p-4">
                {/* Handle bar */}
                <div className="w-10 h-1 rounded-full bg-border mx-auto mb-4" />
                
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  더보기
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {MORE_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors",
                        activeTab === item.id
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon size={22} />
                      <span className="text-[11px] font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Utility actions */}
                <div className="border-t border-border pt-3 space-y-1">
                  <button
                    onClick={() => { onOpenCommandPalette?.(); setShowMore(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Search size={18} />
                    <span>검색</span>
                  </button>
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
                  </button>
                  <button
                    onClick={() => { onLogout(); setShowMore(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut size={18} />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[95] bg-card/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-[60px] px-2">
          {MAIN_TABS.map(tab => {
            const active = tab.id === 'more' ? (showMore || isMoreActive) : isActive(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && tab.id !== 'more' && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <tab.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className={cn(
                  "text-[10px]",
                  active ? "font-bold" : "font-medium"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
