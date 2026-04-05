import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Task } from '../types';

interface BurndownChartProps {
  tasks: Task[];
  sprintStart: string; // ISO date
  sprintEnd: string;   // ISO date
}

function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const BurndownChart = ({ tasks, sprintStart, sprintEnd }: BurndownChartProps) => {
  const data = useMemo(() => {
    const start = new Date(sprintStart);
    const end = new Date(sprintEnd);
    const days = eachDayOfInterval(start, end);
    const totalTasks = tasks.length;

    if (days.length <= 1 || totalTasks === 0) return [];

    const idealDecrement = totalTasks / (days.length - 1);

    return days.map((day, i) => {
      const dayStart = startOfDay(day);
      const now = startOfDay(new Date());

      // Count tasks completed by this day
      const completedByDay = tasks.filter(t =>
        t.status === '완료' && t.end_date &&
        startOfDay(new Date(t.end_date)) <= dayStart
      ).length;

      const remaining = totalTasks - completedByDay;
      const ideal = Math.max(0, totalTasks - idealDecrement * i);

      return {
        date: `${day.getMonth() + 1}/${day.getDate()}`,
        remaining: dayStart <= now ? remaining : null,
        ideal: Math.round(ideal * 10) / 10,
      };
    });
  }, [tasks, sprintStart, sprintEnd]);

  if (data.length === 0) {
    return (
      <div className="notion-card p-5">
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📉 번다운 차트</div>
        <p className="text-sm text-muted-foreground">태스크 또는 기간 데이터가 부족합니다.</p>
      </div>
    );
  }

  const customTooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--foreground)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  };

  return (
    <div className="notion-card p-5">
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>📉 번다운 차트</div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={customTooltipStyle} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="var(--muted-foreground)"
              strokeDasharray="5 5"
              dot={false}
              name="이상"
            />
            <Line
              type="monotone"
              dataKey="remaining"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="실제 잔여"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
