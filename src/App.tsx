/**
 * HALLAON Workspace - Main Application
 */

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const savedSession = localStorage.getItem('hallaon_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch { localStorage.removeItem('hallaon_session'); }
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
  };

  // Realtime Presence
  useEffect(() => {
    if (!session) return;
    const channel = supabase.channel('online-users', {
      config: { presence: { key: 'user' } }
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setPresenceUsers(users.map(u => ({
          user_id: u.user_id,
          email: u.email,
          online_at: u.online_at
        })));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: session.user.id,
            email: session.user.email,
            online_at: new Date().toISOString()
          });
        }
      });
    return () => { channel.unsubscribe(); };
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const [
        { data: tasksData },
        { data: agendasData },
        { data: meetingsData },
        { data: decisionsData }
      ] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('agendas').select('*'),
        supabase.from('meetings').select('*'),
        supabase.from('decisions').select('*'),
      ]);
      if (tasksData) setTasks(tasksData);
      if (agendasData) setAgendas(agendasData);
      if (meetingsData) setMeetings(meetingsData);
      if (decisionsData) setDecisions(decisionsData);
    } catch (error) {
      console.error('데이터 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    fetchData();

    // Realtime subscriptions
    const subs = [
      supabase.channel('tasks-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData).subscribe(),
      supabase.channel('agendas-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'agendas' }, fetchData).subscribe(),
      supabase.channel('meetings-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, fetchData).subscribe(),
      supabase.channel('decisions-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'decisions' }, fetchData).subscribe(),
    ];

    return () => { subs.forEach(s => supabase.removeChannel(s)); };
  }, [session]);

  if (showIntro) {
    return <IntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  if (!session) {
    return <AuthView onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--background)', overflow: 'hidden' }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      <main style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
        <Header
          activeTab={activeTab}
          presenceUsers={presenceUsers}
          onRefresh={fetchData}
        />

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--muted-foreground)' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 14 }}>데이터를 불러오는 중...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {activeTab === 'home' && <HomeView onNavigate={setActiveTab} />}
              {activeTab === 'dashboard' && <DashboardView tasks={tasks} />}
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
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppContent />
    </ThemeProvider>
  );
}
