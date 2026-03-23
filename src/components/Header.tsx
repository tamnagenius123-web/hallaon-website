import React from 'react';
import { PresenceUser } from '../types';
import { RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  presenceUsers: PresenceUser[];
  onRefresh?: () => void;
}

const TAB_CONFIG: Record<string, { title: string; desc: string; emoji: string }> = {
  home: { title: '홈 · 가이드', desc: 'HALLAON 워크스페이스 가이드', emoji: '🏠' },
  dashboard: { title: '종합 대시보드', desc: '프로젝트 현황 종합 리포트', emoji: '📊' },
  tasks: { title: '업무 및 WBS', desc: 'WBS + PERT 기반 일정 관리', emoji: '📋' },
  gantt: { title: '간트 차트', desc: 'CPM 핵심 경로 시각화', emoji: '📈' },
  calendar: { title: '종합 캘린더', desc: '모든 일정을 통합하여 확인', emoji: '📅' },
  agendas: { title: '안건 관리', desc: '팀 안건 등록 및 추적', emoji: '🗂️' },
  decisions: { title: '의사결정 모델', desc: '가중치 평가로 최적 대안 산출', emoji: '⚖️' },
  docs: { title: '문서 허브', desc: '회의록 · 팀 문서 작성 및 관리', emoji: '📄' },
  drive: { title: '구글 드라이브', desc: '공용 드라이브 자료실', emoji: '🗄️' },
};

export const Header = ({ activeTab, presenceUsers, onRefresh }: HeaderProps) => {
  const config = TAB_CONFIG[activeTab] || { title: activeTab, desc: '', emoji: '📌' };

  return (
    <header style={{ marginBottom: 32, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 8 }}>{config.emoji}</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--foreground)', margin: 0 }}>
            {config.title}
          </h1>
          {config.desc && (
            <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4 }}>
              {config.desc}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginTop: 4 }}>
          {/* Presence */}
          {presenceUsers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>
                {presenceUsers.slice(0, 4).map((u, i) => (
                  <div
                    key={u.user_id + i}
                    title={u.email}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `hsl(${(u.email?.charCodeAt(0) || 0) * 37 % 360}, 60%, 55%)`,
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      border: '2px solid var(--background)',
                      marginLeft: i > 0 ? -8 : 0,
                      cursor: 'help',
                    }}
                  >
                    {(u.email?.[0] || 'U').toUpperCase()}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                {presenceUsers.length}명 접속
              </span>
            </div>
          )}

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="notion-btn-ghost"
              style={{ padding: '6px', borderRadius: 6 }}
              title="새로고침"
            >
              <RefreshCw size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
