import React, { useState } from 'react';
import {
  LayoutDashboard, ListTodo, FileText, Calendar as CalendarIcon,
  LogOut, HardDrive, Scale, Sun, Moon, ClipboardList,
  ChevronDown, ChevronRight, Home, Settings, User, Lock,
  BarChart2, BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from 'next-themes';
import { supabase } from '../lib/supabase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { id: 'home', icon: Home, label: '홈 · 가이드' },
      { id: 'dashboard', icon: BarChart2, label: '대시보드' },
    ]
  },
  {
    label: '프로젝트',
    items: [
      { id: 'tasks', icon: ListTodo, label: '업무 및 WBS' },
      { id: 'gantt', icon: LayoutDashboard, label: '간트 차트' },
      { id: 'calendar', icon: CalendarIcon, label: '캘린더' },
    ]
  },
  {
    label: '협업',
    items: [
      { id: 'agendas', icon: ClipboardList, label: '안건' },
      { id: 'decisions', icon: Scale, label: '의사결정' },
      { id: 'docs', icon: BookOpen, label: '문서 허브' },
      { id: 'drive', icon: HardDrive, label: '자료실' },
    ]
  }
];

export const Sidebar = ({ activeTab, setActiveTab, onLogout }: SidebarProps) => {
  const { theme, setTheme } = useTheme();
  const [pwExpanded, setPwExpanded] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const session = JSON.parse(localStorage.getItem('hallaon_session') || '{}');
  const userName = session?.user?.name || '';

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
    <aside className="notion-sidebar shrink-0" style={{ minHeight: '100vh' }}>
      {/* Logo */}
      <div style={{ padding: '10px 8px 12px', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(0,0,0,0.06)', padding: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Hallaon Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', color: 'var(--foreground)' }}>HALLAON</div>
            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Workspace</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 12 }}>
            {group.label && (
              <div className="sidebar-section-label">{group.label}</div>
            )}
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn('sidebar-item w-full', activeTab === item.id && 'active')}
              >
                <item.icon size={15} style={{ flexShrink: 0, opacity: activeTab === item.id ? 0.8 : 0.5 }} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
          marginBottom: 4,
        }}
          onClick={() => setPwExpanded(!pwExpanded)}
          className="hover:bg-[var(--sidebar-hover)]"
        >
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: 'var(--primary)', color: 'var(--primary-foreground)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {userName?.[0]?.toUpperCase() || 'U'}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--foreground)' }}>{userName}</span>
          {pwExpanded ? <ChevronDown size={12} style={{ color: 'var(--muted-foreground)' }} /> : <ChevronRight size={12} style={{ color: 'var(--muted-foreground)' }} />}
        </div>

        {/* PW Change */}
        {pwExpanded && (
          <div style={{ padding: '8px', background: 'var(--secondary)', borderRadius: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>비밀번호 변경</div>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="새 비밀번호"
              className="notion-input"
              style={{ fontSize: 12, padding: '6px 8px', marginBottom: 4 }}
            />
            <input
              type="password"
              value={newPw2}
              onChange={e => setNewPw2(e.target.value)}
              placeholder="확인"
              className="notion-input"
              style={{ fontSize: 12, padding: '6px 8px', marginBottom: 6 }}
            />
            {pwMsg && <div style={{ fontSize: 11, color: pwMsg.includes('완료') ? 'var(--primary)' : '#E03E3E', marginBottom: 6 }}>{pwMsg}</div>}
            <button onClick={handlePwChange} className="notion-btn-primary w-full justify-center" style={{ fontSize: 12, padding: '5px 8px' }}>
              변경
            </button>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="sidebar-item w-full"
        >
          {theme === 'dark' ? <Sun size={14} style={{ opacity: 0.5 }} /> : <Moon size={14} style={{ opacity: 0.5 }} />}
          <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
        </button>

        {/* Logout */}
        <button onClick={onLogout} className="sidebar-item w-full" style={{ color: 'var(--muted-foreground)' }}>
          <LogOut size={14} style={{ opacity: 0.5 }} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
};
