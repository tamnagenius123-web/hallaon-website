import React, { useState } from 'react';
import {
  LayoutDashboard, ListTodo, FileText, Calendar as CalendarIcon,
  LogOut, HardDrive, Scale, Sun, Moon, ClipboardList,
  ChevronDown, ChevronRight, Home, BarChart2, BookOpen,
  ChevronLeft, ChevronRightIcon
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
  const [collapsed, setCollapsed] = useState(false);

  const session = JSON.parse(localStorage.getItem('hallaon_session') || '{}');
  const userName = session?.user?.name || '';
  const userRole = session?.user?.role || 'view';

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
    <aside
      className="notion-sidebar"
      style={{
        width: collapsed ? 52 : 240,
        transition: 'width 0.2s ease',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: collapsed ? '10px 0 12px' : '10px 8px 12px', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'rgba(0,0,0,0.06)', padding: 3, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--foreground)' }}>HALLAON</div>
              <div style={{ fontSize: 9, color: 'var(--muted-foreground)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Workspace</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(0,0,0,0.06)', padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )}
        {/* Collapse toggle */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ padding: 3, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', borderRadius: 4 }}
            title="사이드바 접기"
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {/* Collapse expand button (when collapsed) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{ width: '100%', padding: '6px 0', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', display: 'flex', justifyContent: 'center' }}
          title="사이드바 펼치기"
        >
          <ChevronRightIcon size={13} />
        </button>
      )}

      {/* Nav */}
      <nav style={{ flex: 1 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: collapsed ? 4 : 12 }}>
            {group.label && !collapsed && (
              <div className="sidebar-section-label">{group.label}</div>
            )}
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn('sidebar-item', activeTab === item.id && 'active')}
                style={{
                  justifyContent: collapsed ? 'center' : undefined,
                  padding: collapsed ? '7px 0' : '6px 8px',
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  size={15}
                  style={{
                    flexShrink: 0,
                    opacity: activeTab === item.id ? 0.85 : 0.5,
                    color: activeTab === item.id ? 'var(--primary)' : undefined,
                  }}
                />
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
        {/* User */}
        {!collapsed && (
          <>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
              }}
              onClick={() => setPwExpanded(!pwExpanded)}
              className="hover:bg-[var(--sidebar-hover)]"
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--primary)', color: 'var(--primary-foreground)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {userName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
                <div style={{ fontSize: 9, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{userRole}</div>
              </div>
              {pwExpanded ? <ChevronDown size={11} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} /> : <ChevronRight size={11} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />}
            </div>

            {/* PW Change */}
            {pwExpanded && (
              <div style={{ padding: '8px', background: 'var(--secondary)', borderRadius: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>비밀번호 변경</div>
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="새 비밀번호"
                  className="notion-input"
                  autoComplete="new-password"
                  style={{ fontSize: 12, padding: '5px 8px', marginBottom: 4 }}
                />
                <input
                  type="password"
                  value={newPw2}
                  onChange={e => setNewPw2(e.target.value)}
                  placeholder="확인"
                  className="notion-input"
                  autoComplete="new-password"
                  style={{ fontSize: 12, padding: '5px 8px', marginBottom: 6 }}
                />
                {pwMsg && (
                  <div style={{ fontSize: 11, color: pwMsg.includes('완료') ? '#37B24D' : '#E03E3E', marginBottom: 6 }}>
                    {pwMsg}
                  </div>
                )}
                <button onClick={handlePwChange} className="notion-btn-primary w-full justify-center" style={{ fontSize: 11, padding: '4px 8px' }}>
                  변경
                </button>
              </div>
            )}
          </>
        )}

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="sidebar-item w-full"
          style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '7px 0' : '6px 8px' }}
          title={collapsed ? (theme === 'dark' ? '라이트 모드' : '다크 모드') : undefined}
        >
          {theme === 'dark'
            ? <Sun size={14} style={{ opacity: 0.5 }} />
            : <Moon size={14} style={{ opacity: 0.5 }} />
          }
          {!collapsed && <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>}
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="sidebar-item w-full"
          style={{ justifyContent: collapsed ? 'center' : undefined, padding: collapsed ? '7px 0' : '6px 8px' }}
          title={collapsed ? '로그아웃' : undefined}
        >
          <LogOut size={14} style={{ opacity: 0.5 }} />
          {!collapsed && <span>로그아웃</span>}
        </button>
      </div>
    </aside>
  );
};
