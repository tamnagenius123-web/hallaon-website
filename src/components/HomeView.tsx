/**
 * HomeView - "Today" Operational Hub
 * Redesigned from static guide to actionable dashboard
 * Shows: my tasks, deadlines, upcoming agendas, recent docs, quick actions
 * Falls back to feature guide for new/unassigned users
 */

import React, { useMemo, useState } from 'react';
import { 
  ListTodo, BarChart2, Calendar, ClipboardList, Scale, BookOpen, HardDrive, 
  Crown, Star, ArrowRight, Clock, AlertTriangle, CheckCircle2, FileText, 
  ChevronDown, ChevronRight, Zap, TrendingUp
} from 'lucide-react';
import { TEAM_MEMBERS, TEAM_COLORS, TEAM_EMOJI, TEAM_LEADERS, COUNCIL_LEADERS } from '../lib/orgChart';
import { Task, Agenda, Meeting } from '../types';
import { formatDate, cn } from '../lib/utils';

interface HomeViewProps {
  tasks?: Task[];
  agendas?: Agenda[];
  meetings?: Meeting[];
  onNavigate: (tab: string) => void;
}

const FEATURES = [
  { id: 'tasks', icon: <ListTodo size={20} />, color: '#2383E2', title: '업무 및 WBS', desc: 'WBS 체계로 분해하고 PERT로 기간을 예측합니다.' },
  { id: 'gantt', icon: <BarChart2 size={20} />, color: '#AE3EC9', title: '간트 차트', desc: 'CPM 알고리즘으로 핵심 경로를 강조합니다.' },
  { id: 'calendar', icon: <Calendar size={20} />, color: '#37B24D', title: '종합 캘린더', desc: '업무/안건/회의를 하나의 달력에서 확인합니다.' },
  { id: 'agendas', icon: <ClipboardList size={20} />, color: '#F76707', title: '안건 관리', desc: '회의 안건을 등록하고 상태를 추적합니다.' },
  { id: 'decisions', icon: <Scale size={20} />, color: '#E67700', title: '의사결정 모델', desc: '가중치 평가로 데이터 기반 결정을 합니다.' },
  { id: 'docs', icon: <BookOpen size={20} />, color: '#529CCA', title: '문서 허브', desc: '노션 스타일 에디터로 문서를 작성합니다.' },
  { id: 'drive', icon: <HardDrive size={20} />, color: '#868E96', title: '구글 드라이브', desc: '공용 자료를 실시간으로 조회합니다.' },
];

export const HomeView = ({ tasks = [], agendas = [], meetings = [], onNavigate }: HomeViewProps) => {
  const [showGuide, setShowGuide] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);

  const today = new Date();
  const session = JSON.parse(localStorage.getItem('hallaon_session') || '{}');
  const userName = session?.user?.name || '';

  // My tasks (assigned to current user, not completed)
  const myTasks = useMemo(() => 
    tasks.filter(t => 
      t.assignee?.includes(userName) && t.status !== '완료'
    ).sort((a, b) => {
      if (!a.end_date) return 1;
      if (!b.end_date) return -1;
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    }),
    [tasks, userName]
  );

  // Upcoming deadlines (within 7 days, all users)
  const upcomingDeadlines = useMemo(() => 
    tasks.filter(t => {
      if (t.status === '완료' || !t.end_date) return false;
      const days = Math.ceil((new Date(t.end_date).getTime() - today.getTime()) / 86400000);
      return days >= 0 && days <= 7;
    }).sort((a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()).slice(0, 5),
    [tasks]
  );

  // Active agendas (not completed)
  const activeAgendas = useMemo(() =>
    agendas.filter(a => a.status !== '완료').slice(0, 5),
    [agendas]
  );

  // Recent documents
  const recentDocs = useMemo(() =>
    meetings.slice(0, 5),
    [meetings]
  );

  // Quick stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === '완료').length;
  const inProgressTasks = tasks.filter(t => ['진행 중', '작업 중'].includes(t.status)).length;
  const blockedTasks = tasks.filter(t => t.status === '막힘').length;
  const completionPct = totalTasks > 0 ? Math.round(completedTasks / totalTasks * 100) : 0;

  const getStatusColor = (status: string) => {
    if (status === '완료') return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (status === '진행 중' || status === '작업 중') return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    if (status === '막힘') return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    if (status === '대기' || status === '보류') return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
  };

  const getDDayText = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - today.getTime()) / 86400000);
    if (days < 0) return { text: `D+${Math.abs(days)}`, color: 'text-red-600 font-bold' };
    if (days === 0) return { text: 'D-Day', color: 'text-red-600 font-bold' };
    if (days <= 2) return { text: `D-${days}`, color: 'text-red-500 font-semibold' };
    if (days <= 5) return { text: `D-${days}`, color: 'text-orange-500 font-semibold' };
    return { text: `D-${days}`, color: 'text-muted-foreground' };
  };

  const greetingText = () => {
    const hour = today.getHours();
    if (hour < 6) return '늦은 밤이에요';
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후에요';
    return '좋은 저녁이에요';
  };

  return (
    <div className="animate-fade-in space-y-5 max-w-4xl mx-auto px-4 py-6 md:py-8">
      {/* Greeting + Quick Stats */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {greetingText()}, <span className="text-primary">{userName || '사용자'}</span>님
        </h1>
        <p className="text-sm text-muted-foreground">
          {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* Quick Stats Row - Toss-style compact cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => onNavigate('dashboard')} className="metric-card hover:border-primary/30 transition-colors group cursor-pointer text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="metric-label">프로젝트 진행률</span>
            <TrendingUp size={14} className="text-primary opacity-60 group-hover:opacity-100" />
          </div>
          <div className="text-2xl font-bold text-primary">{completionPct}%</div>
        </button>
        <button onClick={() => onNavigate('tasks')} className="metric-card hover:border-blue-200 dark:hover:border-blue-800 transition-colors group cursor-pointer text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="metric-label">내 업무</span>
            <ListTodo size={14} className="text-blue-500 opacity-60 group-hover:opacity-100" />
          </div>
          <div className="text-2xl font-bold">{myTasks.length}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></div>
        </button>
        <button onClick={() => onNavigate('tasks')} className="metric-card hover:border-orange-200 dark:hover:border-orange-800 transition-colors group cursor-pointer text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="metric-label">마감 임박</span>
            <Clock size={14} className="text-orange-500 opacity-60 group-hover:opacity-100" />
          </div>
          <div className="text-2xl font-bold" style={{ color: upcomingDeadlines.length > 0 ? '#F76707' : undefined }}>{upcomingDeadlines.length}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></div>
        </button>
        <button onClick={() => onNavigate('agendas')} className="metric-card hover:border-purple-200 dark:hover:border-purple-800 transition-colors group cursor-pointer text-left">
          <div className="flex items-center justify-between mb-1">
            <span className="metric-label">미처리 안건</span>
            <ClipboardList size={14} className="text-purple-500 opacity-60 group-hover:opacity-100" />
          </div>
          <div className="text-2xl font-bold">{activeAgendas.length}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></div>
        </button>
      </div>

      {/* Two Column: My Tasks + Deadlines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My Tasks */}
        <div className="notion-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <h2 className="text-sm font-bold">내 할 일</h2>
              {myTasks.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">{myTasks.length}</span>
              )}
            </div>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              전체 보기 <ArrowRight size={12} />
            </button>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              할당된 업무가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {myTasks.slice(0, 5).map(task => {
                const dday = task.end_date ? getDDayText(task.end_date) : null;
                return (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => onNavigate('tasks')}>
                    <div className={cn("w-2 h-2 rounded-full shrink-0", 
                      task.status === '막힘' ? 'bg-red-500' : 
                      task.status === '진행 중' || task.status === '작업 중' ? 'bg-blue-500' : 'bg-gray-300'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", getStatusColor(task.status))}>{task.status}</span>
                        {task.team && <span>{task.team}</span>}
                      </div>
                    </div>
                    {dday && (
                      <span className={cn("text-xs shrink-0", dday.color)}>{dday.text}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="notion-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <h2 className="text-sm font-bold">마감 임박 업무</h2>
              <span className="text-xs text-muted-foreground">7일 이내</span>
            </div>
            <button onClick={() => onNavigate('dashboard')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              대시보드 <ArrowRight size={12} />
            </button>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              마감 임박 업무가 없습니다 🎉
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map(task => {
                const dday = getDDayText(task.end_date);
                return (
                  <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => onNavigate('tasks')}>
                    <div className={cn("text-xs font-bold px-2 py-1 rounded shrink-0 min-w-[44px] text-center",
                      dday.text === 'D-Day' || dday.text.startsWith('D+') ? 'bg-red-100 text-red-600 dark:bg-red-900/30' :
                      'bg-orange-100 text-orange-600 dark:bg-orange-900/30'
                    )}>
                      {dday.text}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{task.title}</div>
                      <div className="text-[11px] text-muted-foreground">{task.assignee || '미지정'} · {task.team}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two Column: Agendas + Recent Docs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Agendas */}
        <div className="notion-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-purple-500" />
              <h2 className="text-sm font-bold">진행 중 안건</h2>
            </div>
            <button onClick={() => onNavigate('agendas')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              전체 보기 <ArrowRight size={12} />
            </button>
          </div>
          {activeAgendas.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              활성 안건이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {activeAgendas.map(agenda => (
                <div key={agenda.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => onNavigate('agendas')}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{agenda.title}</div>
                    <div className="text-[11px] text-muted-foreground">{agenda.proposer} · {agenda.team}</div>
                  </div>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", getStatusColor(agenda.status))}>{agenda.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Documents */}
        <div className="notion-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              <h2 className="text-sm font-bold">최근 문서</h2>
            </div>
            <button onClick={() => onNavigate('docs')} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              전체 보기 <ArrowRight size={12} />
            </button>
          </div>
          {recentDocs.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              문서가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {recentDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => onNavigate('docs')}>
                  <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center text-[13px] shrink-0">
                    📄
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.title}</div>
                    <div className="text-[11px] text-muted-foreground">{doc.category} · {doc.date ? formatDate(doc.date) : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Grid */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {FEATURES.map(feature => (
          <button
            key={feature.id}
            onClick={() => onNavigate(feature.id)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-secondary transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: feature.color + '15', color: feature.color }}>
              {feature.icon}
            </div>
            <span className="text-[10px] md:text-xs font-medium text-muted-foreground group-hover:text-foreground text-center leading-tight">
              {feature.title.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Collapsible Sections: Org Chart & Feature Guide */}
      <div className="space-y-2">
        {/* Org Chart */}
        <div className="notion-card overflow-hidden">
          <button
            onClick={() => setShowOrgChart(!showOrgChart)}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🏛️</span>
              <span className="text-sm font-bold">조직도</span>
            </div>
            {showOrgChart ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          </button>
          {showOrgChart && (
            <div className="px-4 pb-4 space-y-4">
              {/* Council Leaders */}
              <div>
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">회장단</div>
                <div className="flex gap-2 flex-wrap">
                  {COUNCIL_LEADERS.map(leader => (
                    <div key={leader.name} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                      <Crown size={12} color="#F59F00" />
                      <span className="font-bold">{leader.name}</span>
                      <span className="text-xs text-primary/70">{leader.role}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Team Members */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {(['PM', 'FS', 'DM', 'CD', 'OPS'] as const).map(team => {
                  const color = TEAM_COLORS[team];
                  const members = TEAM_MEMBERS[team] || [];
                  const leader = TEAM_LEADERS[team];
                  return (
                    <div key={team} className="rounded-lg border overflow-hidden" style={{ borderColor: color + '30' }}>
                      <div className="px-3 py-2 text-xs font-bold flex items-center gap-1.5" style={{ background: color + '12', color }}>
                        <span>{TEAM_EMOJI[team]}</span> {team}
                      </div>
                      <div className="px-3 py-2 space-y-1">
                        {members.map(m => (
                          <div key={m} className="text-xs flex items-center gap-1.5">
                            {m === leader ? <Star size={9} fill={color} color={color} /> : <div className="w-1.5 h-1.5 rounded-full" style={{ background: color + '60' }} />}
                            <span className={m === leader ? 'font-bold' : ''} style={m === leader ? { color } : undefined}>{m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Feature Guide */}
        <div className="notion-card overflow-hidden">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center justify-between w-full p-4 text-left hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📌</span>
              <span className="text-sm font-bold">기능 가이드</span>
            </div>
            {showGuide ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
          </button>
          {showGuide && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {FEATURES.map(feature => (
                <div key={feature.id} onClick={() => onNavigate(feature.id)} className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: feature.color + '15', color: feature.color }}>
                    {feature.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
