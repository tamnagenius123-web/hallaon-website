import React, { useState, useEffect } from 'react';
import { Agenda } from '../types';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, CheckCircle2, Clock, User, Tag, Calendar, 
  Trash2, Pencil, X, Check, Search, Send, 
  RefreshCw, MoreHorizontal, ChevronRight, Share2,
  LayoutGrid, List, MessageSquare, History
} from 'lucide-react';
import { getStatusColor } from './DashboardView';
import { sendDiscordNotification, formatAgendaForDiscord } from '../lib/discord';
import { useAppContext } from '../App';
import { TEAM_OPTIONS as ORG_TEAMS, TEAM_COLORS as ORG_COLORS } from '../lib/orgChart';
import { HanraonEditor } from './Editor';
import { formatDate, cn } from '../lib/utils';

interface AgendasViewProps {
  agendas: Agenda[];
}

const TEAM_OPTIONS = ORG_TEAMS as unknown as string[];
const STATUS_OPTIONS = ['시작 전', '진행 중', '완료', '보류'];
const TEAM_COLORS: Record<string, string> = ORG_COLORS;

interface AgendaForm {
  title: string;
  proposer: string;
  team: string;
  status: string;
  proposed_date: string;
  content?: string;
}

const defaultForm: AgendaForm = {
  title: '', proposer: '', team: 'PM', status: '시작 전',
  proposed_date: new Date().toISOString().split('T')[0],
  content: '',
};

export const AgendasView = ({ agendas }: AgendasViewProps) => {
  const { optimisticUpdateAgenda, optimisticAddAgenda, optimisticDeleteAgenda } = useAppContext();
  const [selectedAgenda, setSelectedAgenda] = useState<Agenda | null>(null);
  const [showSidePeek, setShowSidePeek] = useState(false);
  const [form, setForm] = useState<AgendaForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterTeam, setFilterTeam] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = agendas.filter(a => {
    if (filterStatus !== '전체' && a.status !== filterStatus) return false;
    if (filterTeam !== '전체' && !a.team?.includes(filterTeam)) return false;
    if (searchQuery && !a.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.proposed_date).getTime() - new Date(a.proposed_date).getTime());

  const handleOpenSidePeek = (agenda: Agenda) => {
    setSelectedAgenda(agenda);
    setForm({
      title: agenda.title || '',
      proposer: agenda.proposer || '',
      team: agenda.team || 'PM',
      status: agenda.status || '시작 전',
      proposed_date: agenda.proposed_date?.split('T')[0] || defaultForm.proposed_date,
      content: agenda.content || '',
    });
    setShowSidePeek(true);
  };

  const handleCreateNew = () => {
    setSelectedAgenda(null);
    setForm(defaultForm);
    setShowSidePeek(true);
  };

  const handleSave = async (updatedFields: Partial<AgendaForm>) => {
    const newForm = { ...form, ...updatedFields };
    setForm(newForm);
    
    if (!newForm.title.trim()) return;
    
    try {
      if (selectedAgenda) {
        optimisticUpdateAgenda(selectedAgenda.id, newForm);
        const { error } = await supabase.from('agendas').update(newForm).eq('id', selectedAgenda.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('agendas').insert([{ ...newForm, is_sent: false }]).select().single();
        if (error) throw error;
        if (data) {
          optimisticAddAgenda(data);
          setSelectedAgenda(data);
        }
      }
    } catch (err) {
      console.error('저장 실패:', err);
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 안건을 삭제하시겠습니까?')) return;
    setDeleting(id);
    optimisticDeleteAgenda(id);
    try {
      const { error } = await supabase.from('agendas').delete().eq('id', id);
      if (error) throw error;
      setShowSidePeek(false);
      showToast('안건이 삭제되었습니다.');
    } catch (err) {
      showToast('삭제에 실패했습니다.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const handleDiscordSend = async (agenda: Agenda) => {
    setSending(agenda.id);
    try {
      const message = formatAgendaForDiscord(agenda);
      const ok = await sendDiscordNotification(message);
      if (ok) {
        await supabase.from('agendas').update({ is_sent: true }).eq('id', agenda.id);
        showToast(`"${agenda.title}" 디스코드 전송 완료!`);
      } else {
        showToast('디스코드 전송 실패.', 'error');
      }
    } catch (err) {
      showToast('전송 중 오류가 발생했습니다.', 'error');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-[1200px] mx-auto px-4 py-8">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg shadow-xl border text-sm font-medium",
              notification.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
            )}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">안건</h1>
              <p className="text-sm text-muted-foreground">회의 안건을 제안하고 논의 과정을 기록합니다.</p>
            </div>
          </div>
          <button className="notion-btn-primary gap-2" onClick={handleCreateNew}>
            <Plus size={18} /> 새 안건
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '전체 안건', value: agendas.length, color: 'text-gray-600' },
            { label: '진행 중', value: agendas.filter(a => a.status === '진행 중').length, color: 'text-blue-600' },
            { label: '완료된 안건', value: agendas.filter(a => a.status === '완료').length, color: 'text-green-600' },
            { label: '보류됨', value: agendas.filter(a => a.status === '보류').length, color: 'text-orange-600' },
          ].map((m, i) => (
            <div key={i} className="metric-card">
              <div className="metric-label">{m.label}</div>
              <div className={cn("metric-value", m.color)}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-y border-border">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="안건 검색..."
                className="notion-input pl-9 h-8 text-xs"
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="notion-select w-28 h-8 text-xs">
              <option>전체 상태</option>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="notion-select w-28 h-8 text-xs">
              <option>전체 팀</option>
              {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex items-center bg-secondary rounded-md p-1 gap-1">
            <button 
              onClick={() => setViewMode('card')}
              className={cn("p-1.5 rounded transition-colors", viewMode === 'card' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={cn("p-1.5 rounded transition-colors", viewMode === 'table' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agenda) => (
            <motion.div
              layoutId={agenda.id}
              key={agenda.id}
              onClick={() => handleOpenSidePeek(agenda)}
              className="notion-card p-4 cursor-pointer group flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2">
                  {agenda.title}
                </h3>
                <span className={cn(
                  "notion-badge shrink-0",
                  agenda.status === '완료' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                  agenda.status === '진행 중' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                  agenda.status === '보류' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                )}>
                  {agenda.status}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-auto">
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span>{agenda.proposer || '미지정'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag size={12} />
                  <span>{agenda.team}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{formatDate(agenda.proposed_date)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="notion-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-4 py-3 font-semibold">안건명</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">입안자</th>
                <th className="px-4 py-3 font-semibold">팀</th>
                <th className="px-4 py-3 font-semibold">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((agenda) => (
                <tr 
                  key={agenda.id} 
                  onClick={() => handleOpenSidePeek(agenda)}
                  className="hover:bg-secondary/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{agenda.title}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "notion-badge",
                      agenda.status === '완료' ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                      agenda.status === '진행 중' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                      "bg-gray-100 text-gray-700 dark:bg-gray-800"
                    )}>
                      {agenda.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{agenda.proposer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{agenda.team}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(agenda.proposed_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Side Peek Panel */}
      <AnimatePresence>
        {showSidePeek && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSidePeek(false)}
              className="side-peek-overlay"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="side-peek-content flex flex-col"
            >
              {/* Side Peek Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowSidePeek(false)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground">
                    <ChevronRight size={20} />
                  </button>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ClipboardList size={14} />
                    <span>안건</span>
                    <span>/</span>
                    <span className="text-foreground font-medium truncate max-w-[150px]">{form.title || '제목 없음'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedAgenda && (
                    <button 
                      onClick={() => handleDiscordSend(selectedAgenda)}
                      className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground group relative"
                      title="디스코드 전송"
                    >
                      {sending === selectedAgenda.id ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  )}
                  <button className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground">
                    <Share2 size={18} />
                  </button>
                  <button 
                    onClick={() => selectedAgenda && handleDelete(selectedAgenda.id)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md text-muted-foreground"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button onClick={() => setShowSidePeek(false)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground ml-2">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Side Peek Content */}
              <div className="flex-1 overflow-y-auto px-12 py-10 space-y-8">
                {/* Title */}
                <textarea
                  value={form.title}
                  onChange={e => handleSave({ title: e.target.value })}
                  placeholder="제목 없음"
                  rows={1}
                  className="w-full text-4xl font-bold bg-transparent border-none outline-none resize-none placeholder:text-gray-200"
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />

                {/* Properties Grid */}
                <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={16} />
                    <span>상태</span>
                  </div>
                  <div>
                    <select 
                      value={form.status} 
                      onChange={e => handleSave({ status: e.target.value })}
                      className="px-2 py-1 rounded hover:bg-secondary transition-colors outline-none cursor-pointer font-medium"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User size={16} />
                    <span>입안자</span>
                  </div>
                  <input
                    value={form.proposer}
                    onChange={e => handleSave({ proposer: e.target.value })}
                    placeholder="입안자 입력"
                    className="px-2 py-1 bg-transparent hover:bg-secondary rounded transition-colors outline-none"
                  />

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag size={16} />
                    <span>팀</span>
                  </div>
                  <div>
                    <select 
                      value={form.team} 
                      onChange={e => handleSave({ team: e.target.value })}
                      className="px-2 py-1 rounded hover:bg-secondary transition-colors outline-none cursor-pointer"
                    >
                      {TEAM_OPTIONS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={16} />
                    <span>날짜</span>
                  </div>
                  <input
                    type="date"
                    value={form.proposed_date}
                    onChange={e => handleSave({ proposed_date: e.target.value })}
                    className="px-2 py-1 bg-transparent hover:bg-secondary rounded transition-colors outline-none cursor-pointer"
                  />
                </div>

                <div className="border-t border-border pt-8">
                  <HanraonEditor 
                    initialContent={form.content} 
                    onChange={(content) => handleSave({ content })}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
