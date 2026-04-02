import React, { useState, useMemo } from 'react';
import { Task } from '../types';
import { calculateCriticalPath } from '../lib/pert';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, ListTodo, CheckCircle2, Clock, User, Tag, Calendar, 
  Trash2, X, Search, Send, RefreshCw, MoreHorizontal, ChevronRight, LayoutGrid, List, AlertCircle,
  Flag, ArrowRight, ArrowRightLeft, Table, BarChart2, UserCheck, Star as StarIcon
} from 'lucide-react';
import { useAppContext } from '../App';
import { TEAM_OPTIONS as ORG_TEAMS, TEAM_COLORS as ORG_COLORS, expandAssignees } from '../lib/orgChart';
import { HanraonEditor } from './Editor';
import { formatDate, cn, getRecommendedAssignees } from '../lib/utils';
import { sendDiscordNotification, formatTaskForDiscord } from '../lib/discord';
import { CommentSection } from './CommentSection';

interface TasksViewProps {
  tasks: Task[];
}

interface TaskWithContent extends Task {
  content?: string;
}

const TEAM_OPTIONS = ORG_TEAMS as unknown as string[];
const STATUS_OPTIONS = ['시작 전', '대기', '진행 중', '작업 중', '막힘', '완료'];

interface TaskForm {
  title: string;
  assignee: string;
  team: string;
  status: string;
  wbs_code: string;
  predecessor: string;
  opt_time: number;
  prob_time: number;
  pess_time: number;
  start_date: string;
  end_date: string;
  content?: string;
}

const defaultForm: TaskForm = {
  title: '', assignee: '', team: 'PM', status: '시작 전',
  wbs_code: '', predecessor: '',
  opt_time: 1, prob_time: 3, pess_time: 7,
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
  content: '',
};

export const TasksView = ({ tasks: initialTasks }: TasksViewProps) => {
  const { optimisticUpdateTask, optimisticAddTask, optimisticDeleteTask } = useAppContext();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSidePeek, setShowSidePeek] = useState(false);
  const [form, setForm] = useState<TaskForm>(defaultForm);
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterTeam, setFilterTeam] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const tasks = useMemo(() => calculateCriticalPath(initialTasks), [initialTasks]);
  const recommendedAssignees = useMemo(() => getRecommendedAssignees(initialTasks), [initialTasks]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = tasks.filter(t => {
    if (filterStatus !== '전체' && t.status !== filterStatus) return false;
    if (filterTeam !== '전체' && !t.team?.includes(filterTeam)) return false;
    if (searchQuery && !t.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  const handleOpenSidePeek = (task: Task) => {
    setSelectedTask(task);
    setForm({
      title: task.title || '',
      assignee: task.assignee || '',
      team: task.team || 'PM',
      status: task.status || '시작 전',
      wbs_code: task.wbs_code || '',
      predecessor: task.predecessor || '',
      opt_time: task.opt_time || 1,
      prob_time: task.prob_time || 3,
      pess_time: task.pess_time || 7,
      start_date: task.start_date?.split('T')[0] || defaultForm.start_date,
      end_date: task.end_date?.split('T')[0] || defaultForm.end_date,
      content: task.content || '',
    });
    setShowSidePeek(true);
  };

  const handleCreateNew = () => {
    setSelectedTask(null);
    setForm(defaultForm);
    setShowSidePeek(true);
  };

  const handleSave = async (updatedFields: Partial<TaskForm>) => {
    const newForm = { ...form, ...updatedFields };
    setForm(newForm);
    
    if (!newForm.title.trim()) return;
    
    const teVal = newForm.opt_time && newForm.prob_time && newForm.pess_time
      ? (newForm.opt_time + 4 * newForm.prob_time + newForm.pess_time) / 6
      : 0;
    
    const payload = { ...newForm, exp_time: teVal };
    
    try {
      if (selectedTask) {
        optimisticUpdateTask(selectedTask.id, payload);
        const { error } = await supabase.from('tasks').update(payload).eq('id', selectedTask.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('tasks').insert([payload]).select().single();
        if (error) throw error;
        if (data) {
          optimisticAddTask(data);
          setSelectedTask(data);
        }
      }
    } catch (err) {
      console.error('저장 실패:', err);
      showToast('저장에 실패했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 업무를 삭제하시겠습니까?')) return;
    optimisticDeleteTask(id);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setShowSidePeek(false);
      showToast('업무가 삭제되었습니다.');
    } catch (err) {
      showToast('삭제에 실패했습니다.', 'error');
    }
  };

  const handleDiscordSend = async (task: Task) => {
    setSending(task.id);
    try {
      const message = formatTaskForDiscord(task);
      const ok = await sendDiscordNotification(message);
      if (ok) {
        showToast(`"${task.title}" 디스코드 전송 완료!`);
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
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
              <ListTodo size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">업무 및 WBS</h1>
              <p className="text-sm text-muted-foreground">프로젝트의 상세 업무를 관리하고 PERT/CPM 기반으로 일정을 추적합니다.</p>
            </div>
          </div>
          <button className="notion-btn-primary gap-2" onClick={handleCreateNew}>
            <Plus size={18} /> 새 업무
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '전체 업무', value: tasks.length, color: 'text-gray-600' },
            { label: '진행 중', value: tasks.filter(t => ['진행 중', '작업 중'].includes(t.status)).length, color: 'text-blue-600' },
            { label: '임계 경로(Critical)', value: tasks.filter(t => t.is_critical).length, color: 'text-red-600' },
            { label: '완료됨', value: tasks.filter(t => t.status === '완료').length, color: 'text-green-600' },
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
                placeholder="업무 검색..."
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
          {filtered.map((task) => (
            <motion.div
              layoutId={task.id}
              key={task.id}
              onClick={() => handleOpenSidePeek(task)}
              className={cn(
                "notion-card p-4 cursor-pointer group flex flex-col gap-3 relative overflow-hidden",
                task.is_critical && "border-red-200 bg-red-50/30"
              )}
            >
              {task.is_critical && (
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-[9px] text-white font-bold uppercase tracking-widest">Critical</div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2">
                  <span className="text-muted-foreground mr-1.5 font-mono text-xs">{task.wbs_code}</span>
                  {task.title}
                </h3>
                <span className={cn(
                  "notion-badge shrink-0",
                  task.status === '완료' ? "bg-green-100 text-green-700" :
                  task.status === '막힘' ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                )}>
                  {task.status}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-auto">
                <div className="flex items-center gap-1">
                  <User size={12} />
                  <span>{task.assignee || '미지정'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span>{task.exp_time?.toFixed(1)}일</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={12} />
                  <span>{formatDate(task.start_date)}</span>
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
                <th className="px-4 py-3 font-semibold">WBS</th>
                <th className="px-4 py-3 font-semibold">업무명</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold">담당자</th>
                <th className="px-4 py-3 font-semibold">기대 기간</th>
                <th className="px-4 py-3 font-semibold">기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((task) => (
                <tr 
                  key={task.id} 
                  onClick={() => handleOpenSidePeek(task)}
                  className={cn(
                    "hover:bg-secondary/30 cursor-pointer transition-colors",
                    task.is_critical && "bg-red-50/20"
                  )}
                >
                  <td className="px-4 py-3 font-mono text-xs">{task.wbs_code}</td>
                  <td className="px-4 py-3 font-medium">
                    {task.is_critical && <span className="text-red-500 mr-1">●</span>}
                    {task.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "notion-badge",
                      task.status === '완료' ? "bg-green-100 text-green-700" :
                      task.status === '진행 중' ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.assignee}</td>
                  <td className="px-4 py-3 text-muted-foreground">{task.exp_time?.toFixed(1)}일</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(task.start_date)} - {formatDate(task.end_date)}
                  </td>
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
                    <ListTodo size={14} />
                    <span>업무</span>
                    <span>/</span>
                    <span className="text-foreground font-medium truncate max-w-[150px]">{form.title || '제목 없음'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedTask && (
                    <button 
                      onClick={() => handleDiscordSend(selectedTask)}
                      className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground group relative"
                      title="디스코드 전송"
                    >
                      {sending === selectedTask.id ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  )}
                  <button 
                    onClick={() => selectedTask && handleDelete(selectedTask.id)}
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
                    <Tag size={16} />
                    <span>WBS 코드</span>
                  </div>
                  <input
                    value={form.wbs_code}
                    onChange={e => handleSave({ wbs_code: e.target.value })}
                    placeholder="WBS 코드 입력"
                    className="px-2 py-1 bg-transparent hover:bg-secondary rounded transition-colors outline-none font-mono text-xs"
                  />

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowRightLeft size={16} />
                    <span>선행 업무</span>
                  </div>
                  <input
                    value={form.predecessor}
                    onChange={e => handleSave({ predecessor: e.target.value })}
                    placeholder="WBS 코드 (콤마 구분)"
                    className="px-2 py-1 bg-transparent hover:bg-secondary rounded transition-colors outline-none"
                  />

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User size={16} />
                    <span>담당자</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      value={form.assignee}
                      onChange={e => handleSave({ assignee: e.target.value })}
                      placeholder="담당자 입력"
                      className="px-2 py-1 bg-transparent hover:bg-secondary rounded transition-colors outline-none"
                    />
                    {/* Assignee Recommendations */}
                    {!form.assignee && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recommendedAssignees.slice(0, 4).map((rec, i) => (
                          <button
                            key={rec.userName}
                            onClick={() => handleSave({ assignee: rec.userName })}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer border",
                              i === 0
                                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                                : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {i === 0 && <UserCheck size={10} />}
                            {rec.userName}
                            <span className="opacity-60">({rec.taskCount})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={16} />
                    <span>기간</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => handleSave({ start_date: e.target.value })}
                      className="px-2 py-1 bg-transparent hover:bg-secondary rounded transition-colors outline-none cursor-pointer"
                    />
                    <ArrowRight size={14} className="text-muted-foreground" />
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => handleSave({ end_date: e.target.value })}
                      className="px-2 py-1 bg-transparent hover:bg-secondary rounded transition-colors outline-none cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle size={16} />
                    <span>PERT 시간</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase">낙관</span>
                      <input type="number" value={form.opt_time} onChange={e => handleSave({ opt_time: Number(e.target.value) })} className="w-12 px-1 py-0.5 bg-secondary rounded outline-none" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase">기대</span>
                      <input type="number" value={form.prob_time} onChange={e => handleSave({ prob_time: Number(e.target.value) })} className="w-12 px-1 py-0.5 bg-secondary rounded outline-none" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-muted-foreground uppercase">비관</span>
                      <input type="number" value={form.pess_time} onChange={e => handleSave({ pess_time: Number(e.target.value) })} className="w-12 px-1 py-0.5 bg-secondary rounded outline-none" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-border pt-8">
                  <HanraonEditor 
                    initialContent={form.content} 
                    onChange={(content) => handleSave({ content })}
                  />
                </div>

                {/* Comment Section */}
                {selectedTask && (
                  <div className="border-t border-border pt-8">
                    <CommentSection targetId={selectedTask.id} targetType="task" />
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
