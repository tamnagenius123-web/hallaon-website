import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Task, Agenda, Meeting } from '../types';
import { Plus, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalendarViewProps {
  tasks: Task[];
  agendas?: Agenda[];
  meetings?: Meeting[];
}

const TEAM_COLORS: Record<string, string> = {
  PM: '#2383E2', CD: '#AE3EC9', FS: '#37B24D', DM: '#F76707', OPS: '#E67700'
};

const STATUS_COLOR: Record<string, string> = {
  '완료': '#37B24D', '막힘': '#E03E3E', '진행 중': '#2383E2',
  '작업 중': '#529CCA', '대기': '#AE3EC9', '시작 전': '#868E96', '보류': '#F76707',
};

interface Schedule {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  repeat: '없음' | '매주' | '격주' | '매월';
  color: string;
  active: boolean;
}

interface ScheduleForm {
  name: string;
  start_date: string;
  end_date: string;
  repeat: string;
  color: string;
}

export const CalendarView = ({ tasks, agendas = [], meetings = [] }: CalendarViewProps) => {
  const [showTasks, setShowTasks] = useState(true);
  const [showAgendas, setShowAgendas] = useState(true);
  const [showMeetings, setShowMeetings] = useState(true);
  const [showSchedules, setShowSchedules] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>({
    name: '', start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    repeat: '없음', color: '#2383E2',
  });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const events: any[] = [];

  if (showTasks) {
    tasks.forEach(t => {
      if (!t.start_date || !t.end_date) return;
      const color = TEAM_COLORS[t.team?.split(',')[0]?.trim() || ''] || '#868E96';
      const endDt = new Date(t.end_date);
      endDt.setDate(endDt.getDate() + 1);
      events.push({
        id: `task-${t.id}`,
        title: `📋 ${t.title}`,
        start: t.start_date.split('T')[0],
        end: endDt.toISOString().split('T')[0],
        backgroundColor: color + '20',
        borderColor: color,
        textColor: color,
        extendedProps: { type: 'task', data: t },
      });
    });
  }

  if (showAgendas) {
    agendas.forEach(a => {
      if (!a.proposed_date) return;
      events.push({
        id: `agenda-${a.id}`,
        title: `🗂️ ${a.title}`,
        start: a.proposed_date.split('T')[0],
        allDay: true,
        backgroundColor: '#FF7EB315',
        borderColor: '#FF7EB3',
        textColor: '#FF7EB3',
        extendedProps: { type: 'agenda', data: a },
      });
    });
  }

  if (showMeetings) {
    meetings.forEach(m => {
      if (!m.date) return;
      events.push({
        id: `meeting-${m.id}`,
        title: `📄 ${m.title}`,
        start: m.date.split('T')[0],
        allDay: true,
        backgroundColor: '#37B24D15',
        borderColor: '#37B24D',
        textColor: '#37B24D',
        extendedProps: { type: 'meeting', data: m },
      });
    });
  }

  if (showSchedules) {
    schedules.filter(s => s.active).forEach(s => {
      const startDate = new Date(s.start_date);
      const endDate = new Date(s.end_date);
      const color = s.color || '#F59F00';

      if (s.repeat === '없음') {
        const endDt = new Date(endDate);
        endDt.setDate(endDt.getDate() + 1);
        events.push({
          id: `sched-${s.id}`,
          title: `📆 ${s.name}`,
          start: s.start_date,
          end: endDt.toISOString().split('T')[0],
          backgroundColor: color + '15',
          borderColor: color,
          textColor: color,
          allDay: true,
        });
      } else {
        let delta = 7; // 매주
        if (s.repeat === '격주') delta = 14;
        if (s.repeat === '매월') delta = 30;
        const limit = new Date(endDate.getTime() + 180 * 86400000);
        let cur = new Date(startDate);
        while (cur <= limit) {
          events.push({
            id: `sched-${s.id}-${cur.getTime()}`,
            title: `🔄 ${s.name}`,
            start: cur.toISOString().split('T')[0],
            allDay: true,
            backgroundColor: color + '15',
            borderColor: color,
            textColor: color,
          });
          cur.setDate(cur.getDate() + delta);
        }
      }
    });
  }

  const handleAddSchedule = () => {
    const newSch: Schedule = {
      id: Date.now().toString(),
      name: scheduleForm.name,
      start_date: scheduleForm.start_date,
      end_date: scheduleForm.end_date,
      repeat: scheduleForm.repeat as any,
      color: scheduleForm.color,
      active: true,
    };
    setSchedules(p => [...p, newSch]);
    setShowScheduleForm(false);
    setScheduleForm({ name: '', start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0], repeat: '없음', color: '#2383E2' });
  };

  const handleRemoveSchedule = (id: string) => {
    setSchedules(p => p.filter(s => s.id !== id));
  };

  const TOGGLE_FILTERS = [
    { key: 'tasks', label: '📋 업무', state: showTasks, setState: setShowTasks, color: '#2383E2' },
    { key: 'agendas', label: '🗂️ 안건', state: showAgendas, setState: setShowAgendas, color: '#FF7EB3' },
    { key: 'meetings', label: '📄 회의', state: showMeetings, setState: setShowMeetings, color: '#37B24D' },
    { key: 'schedules', label: '📆 정기일정', state: showSchedules, setState: setShowSchedules, color: '#F59F00' },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      {/* Toggle Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {TOGGLE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => f.setState(!f.state)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, border: `1px solid ${f.state ? f.color + '40' : 'var(--border)'}`,
              background: f.state ? f.color + '10' : 'transparent',
              color: f.state ? f.color : 'var(--muted-foreground)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.state ? f.color : 'var(--muted-foreground)' }} />
            {f.label}
          </button>
        ))}

        {/* Add Schedule button */}
        <button
          onClick={() => setShowScheduleForm(true)}
          className="notion-btn-secondary"
          style={{ fontSize: 12, marginLeft: 'auto' }}
        >
          <Plus size={13} /> 정기 일정 등록
        </button>
      </div>

      {/* Registered Schedules */}
      {schedules.length > 0 && (
        <div className="notion-card p-3">
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--muted-foreground)' }}>등록된 정기 일정</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {schedules.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5, background: s.color + '15', border: `1px solid ${s.color}30`, fontSize: 11 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                <span style={{ color: s.color, fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: 'var(--muted-foreground)' }}>({s.repeat})</span>
                <button onClick={() => handleRemoveSchedule(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, color: 'var(--muted-foreground)' }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="notion-card p-4 calendar-container">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
          height={640}
          locale="ko"
          buttonText={{ today: '오늘', month: '월간', week: '주간' }}
          dayMaxEvents={3}
          eventClick={(info) => {
            setSelectedEvent({
              title: info.event.title,
              start: info.event.startStr,
              end: info.event.endStr,
              type: info.event.extendedProps.type,
              data: info.event.extendedProps.data,
            });
          }}
        />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-container" style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)} className="notion-btn-ghost" style={{ padding: 5 }}><X size={14} /></button>
            </div>
            {selectedEvent.type === 'task' && selectedEvent.data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>담당자: </span>{selectedEvent.data.assignee || '-'}</div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>팀: </span>{selectedEvent.data.team || '-'}</div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>상태: </span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: STATUS_COLOR[selectedEvent.data.status] + '15', color: STATUS_COLOR[selectedEvent.data.status], padding: '1px 6px', borderRadius: 3 }}>
                    {selectedEvent.data.status}
                  </span>
                </div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>기간: </span>{selectedEvent.data.start_date?.split('T')[0]} ~ {selectedEvent.data.end_date?.split('T')[0]}</div>
                {selectedEvent.data.wbs_code && <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>WBS: </span>{selectedEvent.data.wbs_code}</div>}
              </div>
            )}
            {selectedEvent.type === 'agenda' && selectedEvent.data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>입안자: </span>{selectedEvent.data.proposer || '-'}</div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>팀: </span>{selectedEvent.data.team || '-'}</div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>상태: </span>{selectedEvent.data.status}</div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>입안일: </span>{selectedEvent.data.proposed_date?.split('T')[0]}</div>
              </div>
            )}
            {selectedEvent.type === 'meeting' && selectedEvent.data && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>분류: </span>{selectedEvent.data.category || '-'}</div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>작성자: </span>{selectedEvent.data.author_id || '-'}</div>
                <div><span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>날짜: </span>{selectedEvent.data.date?.split('T')[0]}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Form Modal */}
      {showScheduleForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowScheduleForm(false); }}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>정기 일정 등록</h3>
              <button onClick={() => setShowScheduleForm(false)} className="notion-btn-ghost" style={{ padding: 5 }}><X size={14} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>일정 이름</label>
                <input value={scheduleForm.name} onChange={e => setScheduleForm(p => ({ ...p, name: e.target.value }))} placeholder="예: 주간 팀 미팅" className="notion-input" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>시작 날짜</label>
                  <input type="date" value={scheduleForm.start_date} onChange={e => setScheduleForm(p => ({ ...p, start_date: e.target.value }))} className="notion-input" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>종료 날짜</label>
                  <input type="date" value={scheduleForm.end_date} onChange={e => setScheduleForm(p => ({ ...p, end_date: e.target.value }))} className="notion-input" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>반복</label>
                  <select value={scheduleForm.repeat} onChange={e => setScheduleForm(p => ({ ...p, repeat: e.target.value }))} className="notion-select">
                    {['없음', '매주', '격주', '매월'].map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>색상</label>
                  <input type="color" value={scheduleForm.color} onChange={e => setScheduleForm(p => ({ ...p, color: e.target.value }))} style={{ width: '100%', height: 38, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2 }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowScheduleForm(false)} className="notion-btn-secondary">취소</button>
              <button onClick={handleAddSchedule} disabled={!scheduleForm.name.trim()} className="notion-btn-primary">
                <Check size={14} /> 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
