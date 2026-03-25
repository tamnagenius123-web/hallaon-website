/**
 * HALLAON Workspace - Main Application (v3.0 - Global SaaS Level)
 * Optimistic UI + Supabase Realtime + Full State Management
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Task, Agenda, Meeting, Decision, PresenceUser } from './types';
import { ThemeProvider } from 'next-themes';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { DocsView } from './components/DocsView';
import { DriveView } from './components/DriveView';
import { CalendarView } from './components/CalendarView';
import { DecisionsView } from './components/DecisionsView';
import { AgendasView } from './components/AgendasView';
import { GanttView } from './components/GanttView';
import { HomeView } from './components/HomeView';
import { IntroAnimation } from './components/IntroAnimation';
import { AuthView } from './components/AuthView';

// Global App Context for Optimistic UI
export interface AppContextType {
  tasks: Task[];
  agendas: Agenda[];
  meetings: Meeting[];
  decisions: Decision[];
  session: any;
  refreshing: boolean;
  // Optimistic mutators
  optimisticUpdateTask: (id: string, patch: Partial<Task>) => void;
  optimisticAddTask: (task: Task) => void;
  optimisticDeleteTask: (id: string) => void;
  optimisticUpdateAgenda: (id: string, patch: Partial<Agenda>) => void;
  optimisticAddAgenda: (agenda: Agenda) => void;
  optimisticDeleteAgenda: (id: string) => void;
  optimisticAddMeeting: (meeting: Meeting) => void;
  optimisticUpdateMeeting: (id: string, patch: Partial<Meeting>) => void;
  optimisticDeleteMeeting: (id: string) => void;
  optimisticAddDecision: (decision: Decision) => void;
  optimisticDeleteDecision: (id: string) => void;
  refetch: () => void;
}

export const AppContext = createContext<AppContextType | null>(null);
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppContent');
  return ctx;
};

function AppContent() {
  const [showIntro, setShowIntro] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // --- Session ---
  useEffect(() => {
    const savedSession = localStorage.getItem('hallaon_session');
    if (savedSession) {
      try { setSession(JSON.parse(savedSession)); }
      catch { localStorage.removeItem('hallaon_session'); }
    }
  }, []);

  const handleAuthSuccess = () => {
    const savedSession = localStorage.getItem('hallaon_session');
    if (savedSession) {
      try { setSession(JSON.parse(savedSession)); } catch {}
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hallaon_session');
    setSession(null);
    setTasks([]); setAgendas([]); setMeetings([]); setDecisions([]);
  };

  // --- Realtime Presence ---
  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('hallaon-presence', {
      config: { presence: { key: session.user.id } }
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setPresenceUsers(users.map(u => ({
          user_id: u.user_id || '',
          email: u.email || '',
          online_at: u.online_at || ''
        })));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: session.user.id,
            email: session.user.name || session.user.email,
            online_at: new Date().toISOString()
          });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // --- Data Fetching ---
  const fetchData = useCallback(async (showLoading = true) => {
    if (!session) return;
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const [
        { data: tasksData },
        { data: agendasData },
        { data: meetingsData },
        { data: decisionsData }
      ] = await Promise.all([
        supabase.from('tasks').select('*').order('wbs_code', { ascending: true }),
        supabase.from('agendas').select('*').order('proposed_date', { ascending: false }),
        supabase.from('meetings').select('*').order('date', { ascending: false }),
        supabase.from('decisions').select('*').order('created_at', { ascending: false }),
      ]);
      if (tasksData) setTasks(tasksData);
      if (agendasData) setAgendas(agendasData);
      if (meetingsData) setMeetings(meetingsData);
      if (decisionsData) setDecisions(decisionsData);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchData(true);
    const channels = [
      supabase.channel('rt-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchData(false))
        .subscribe(),
      supabase.channel('rt-agendas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'agendas' }, () => fetchData(false))
        .subscribe(),
      supabase.channel('rt-meetings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => fetchData(false))
        .subscribe(),
      supabase.channel('rt-decisions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, () => fetchData(false))
        .subscribe(),
    ];
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  }, [session, fetchData]);

  // --- Optimistic Mutators ---
  const optimisticUpdateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);
  const optimisticAddTask = useCallback((task: Task) => {
    setTasks(prev => [...prev, task].sort((a, b) => (a.wbs_code || '').localeCompare(b.wbs_code || '')));
  }, []);
  const optimisticDeleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const optimisticUpdateAgenda = useCallback((id: string, patch: Partial<Agenda>) => {
    setAgendas(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, []);
  const optimisticAddAgenda = useCallback((agenda: Agenda) => {
    setAgendas(prev => [agenda, ...prev]);
  }, []);
  const optimisticDeleteAgenda = useCallback((id: string) => {
    setAgendas(prev => prev.filter(a => a.id !== id));
  }, []);

  const optimisticAddMeeting = useCallback((meeting: Meeting) => {
    setMeetings(prev => [meeting, ...prev]);
  }, []);
  const optimisticUpdateMeeting = useCallback((id: string, patch: Partial<Meeting>) => {
    setMeetings(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  }, []);
  const optimisticDeleteMeeting = useCallback((id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
  }, []);

  const optimisticAddDecision = useCallback((decision: Decision) => {
    setDecisions(prev => [decision, ...prev]);
  }, []);
  const optimisticDeleteDecision = useCallback((id: string) => {
    setDecisions(prev => prev.filter(d => d.id !== id));
  }, []);

  const refetch = useCallback(() => fetchData(false), [fetchData]);

  const contextValue: AppContextType = {
    tasks, agendas, meetings, decisions, session, refreshing,
    optimisticUpdateTask, optimisticAddTask, optimisticDeleteTask,
    optimisticUpdateAgenda, optimisticAddAgenda, optimisticDeleteAgenda,
    optimisticAddMeeting, optimisticUpdateMeeting, optimisticDeleteMeeting,
    optimisticAddDecision, optimisticDeleteDecision,
    refetch,
  };

  if (showIntro) {
    return <IntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  if (!session) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{ display: 'flex', height: '100vh', background: 'var(--background)', overflow: 'hidden' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

        <main style={{ flex: 1, overflow: 'auto', padding: '28px 36px' }}>
          <Header
            activeTab={activeTab}
            presenceUsers={presenceUsers}
            onRefresh={() => fetchData(false)}
          />

          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 300, gap: 12, color: 'var(--muted-foreground)',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2px solid var(--border)', borderTopColor: 'var(--primary)',
                animation: 'spin 1s linear infinite',
              }} />
              <span style={{ fontSize: 14 }}>데이터를 불러오는 중...</span>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'home' && <HomeView onNavigate={setActiveTab} />}
                {activeTab === 'dashboard' && <DashboardView tasks={tasks} agendas={agendas} />}
                {activeTab === 'tasks' && <TasksView tasks={tasks} />}
                {activeTab === 'gantt' && <GanttView tasks={tasks} />}
                {activeTab === 'docs' && <DocsView meetings={meetings} />}
                {activeTab === 'drive' && <DriveView />}
                {activeTab === 'calendar' && <CalendarView tasks={tasks} agendas={agendas} meetings={meetings} />}
                {activeTab === 'agendas' && <AgendasView agendas={agendas} />}
                {activeTab === 'decisions' && <DecisionsView decisions={decisions} agendas={agendas} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppContent />
    </ThemeProvider>
  );
}
