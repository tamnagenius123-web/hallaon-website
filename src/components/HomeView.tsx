import React from 'react';
import { ListTodo, BarChart2, Calendar, ClipboardList, Scale, BookOpen, HardDrive, Crown, Star } from 'lucide-react';
import { TEAM_MEMBERS, TEAM_COLORS, TEAM_EMOJI, TEAM_LEADERS, COUNCIL_LEADERS } from '../lib/orgChart';

interface HomeViewProps {
  onNavigate: (tab: string) => void;
}

const FEATURES = [
  {
    id: 'tasks',
    icon: <ListTodo size={20} />,
    color: '#2383E2',
    title: '업무 및 WBS',
    desc: '프로젝트 작업을 WBS 체계로 분해하고 PERT로 기간을 예측합니다.',
    tips: [
      'WBS 코드는 대분류.중분류.소분류 형태 (예: 1.1.1)',
      '낙관적(O), 보통(M), 비관적(P) 시간으로 기대 시간(TE) 자동 계산',
      '선행 업무 설정으로 CPM 핵심 경로 자동 식별',
    ],
  },
  {
    id: 'gantt',
    icon: <BarChart2 size={20} />,
    color: '#AE3EC9',
    title: '간트 차트',
    desc: 'CPM 알고리즘으로 핵심 경로를 붉은 막대로 강조합니다.',
    tips: [
      '붉은 막대 = 지연 시 전체 일정에 영향',
      '파란 세로선 = 오늘 날짜',
      '팀별/완료 필터로 원하는 업무만 확인',
    ],
  },
  {
    id: 'calendar',
    icon: <Calendar size={20} />,
    color: '#37B24D',
    title: '종합 캘린더',
    desc: '업무 · 안건 · 회의 · 정기 일정을 하나의 달력에서 확인합니다.',
    tips: [
      '토글로 업무/안건/회의/정기일정 개별 표시',
      '정기 일정 등록으로 반복 일정 관리',
      '이벤트 클릭으로 상세 정보 확인',
    ],
  },
  {
    id: 'agendas',
    icon: <ClipboardList size={20} />,
    color: '#F76707',
    title: '안건 관리',
    desc: '팀에서 논의할 안건을 등록하고 상태를 추적합니다.',
    tips: [
      '안건명 검색 및 팀/상태별 필터링',
      '카드 또는 목록 뷰 전환',
      '상태 클릭으로 즉시 변경',
    ],
  },
  {
    id: 'decisions',
    icon: <Scale size={20} />,
    color: '#E67700',
    title: '의사결정 모델',
    desc: '가중치 평가 알고리즘으로 주관을 배제한 데이터 기반 결정을 합니다.',
    tips: [
      '평가 기준 정의 및 가중치 부여 (합계 100%)',
      '대안 입력 후 1~10점 평가',
      '최적 대안 자동 추천 + 차트 시각화',
    ],
  },
  {
    id: 'docs',
    icon: <BookOpen size={20} />,
    color: '#529CCA',
    title: '문서 허브',
    desc: '회의록과 팀 문서를 노션 스타일 에디터로 작성합니다.',
    tips: [
      '폴더별(전체회의/팀별) 문서 분류',
      'BlockNote 에디터로 서식 있는 문서 작성',
      '제목 클릭으로 인라인 편집',
    ],
  },
  {
    id: 'drive',
    icon: <HardDrive size={20} />,
    color: '#868E96',
    title: '구글 드라이브',
    desc: '구글 드라이브의 공용 자료를 실시간으로 조회합니다.',
    tips: [
      '서비스 계정 연동 시 파일 목록 자동 표시',
      '파일 열기 및 다운로드 지원',
    ],
  },
];

export const HomeView = ({ onNavigate }: HomeViewProps) => {
  return (
    <div className="animate-fade-in space-y-8 max-w-4xl">
      {/* Welcome */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(35,131,226,0.06) 0%, rgba(55,178,77,0.04) 100%)',
        border: '1px solid rgba(35,131,226,0.12)',
        borderRadius: 14,
        padding: '28px 32px',
      }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🏛️</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
          HALLAON Workspace
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.7, maxWidth: 600 }}>
          탐라영재관 자율회 한라온의 <strong style={{ color: 'var(--foreground)' }}>데이터 기반 의사결정 · 일정 관리 · 협업 플랫폼</strong>입니다.<br />
          아래 기능 가이드를 참고하여 워크스페이스를 활용하세요.
        </p>
      </div>

      {/* Org Chart */}
      <div className="notion-card p-5">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏛️ 조직도</h2>

        {/* 회장단 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>회장단</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {COUNCIL_LEADERS.map(leader => (
              <div key={leader.name} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                borderRadius: 10, background: 'linear-gradient(135deg, rgba(35,131,226,0.10), rgba(123,97,255,0.08))',
                border: '1px solid rgba(35,131,226,0.2)',
              }}>
                <Crown size={13} color="#F59F00" />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--foreground)' }}>{leader.name}</span>
                <span style={{ fontSize: 11, color: '#F59F00', fontWeight: 600 }}>{leader.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 팀별 멤버 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {(['PM', 'FS', 'DM', 'CD', 'OPS'] as const).map(team => {
            const color = TEAM_COLORS[team];
            const emoji = TEAM_EMOJI[team];
            const members = TEAM_MEMBERS[team] || [];
            const leader = TEAM_LEADERS[team];
            const descMap: Record<string, string> = {
              PM: '프로젝트 매니지먼트', FS: '풀스택 개발',
              DM: '데이터 & 마케팅', CD: '콘텐츠 & 디자인', OPS: '운영 & 총괄',
            };
            return (
              <div key={team} style={{
                borderRadius: 10, border: `1px solid ${color}25`,
                background: color + '08', overflow: 'hidden',
              }}>
                {/* 팀 헤더 */}
                <div style={{
                  padding: '8px 12px', background: color + '15',
                  borderBottom: `1px solid ${color}20`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 14 }}>{emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: 13, color }}>{team}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted-foreground)', marginLeft: 2 }}>{descMap[team]}</span>
                </div>
                {/* 멤버 목록 */}
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {members.map(member => (
                    <div key={member} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      {member === leader
                        ? <Star size={10} color={color} fill={color} />
                        : <div style={{ width: 6, height: 6, borderRadius: '50%', background: color + '60', flexShrink: 0 }} />}
                      <span style={{
                        color: member === leader ? color : 'var(--foreground)',
                        fontWeight: member === leader ? 700 : 400,
                      }}>{member}</span>
                      {member === leader && (
                        <span style={{ fontSize: 9, color, fontWeight: 700, marginLeft: 2 }}>팀장</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Guide */}
      <div className="notion-card p-5">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📊 업무 상태 흐름</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { s: '시작 전', c: '#868E96' },
            { s: '→', c: 'var(--muted-foreground)' },
            { s: '대기', c: '#AE3EC9' },
            { s: '→', c: 'var(--muted-foreground)' },
            { s: '진행 중', c: '#2383E2' },
            { s: '→', c: 'var(--muted-foreground)' },
            { s: '작업 중', c: '#529CCA' },
            { s: '→', c: 'var(--muted-foreground)' },
            { s: '막힘', c: '#E03E3E' },
            { s: '→', c: 'var(--muted-foreground)' },
            { s: '완료', c: '#37B24D' },
          ].map((item, i) => (
            <span key={i} style={{
              fontSize: item.s === '→' ? 14 : 12,
              fontWeight: item.s === '→' ? 400 : 700,
              color: item.c,
              padding: item.s === '→' ? '0' : '3px 9px',
              borderRadius: item.s === '→' ? 0 : 4,
              background: item.s === '→' ? 'transparent' : item.c + '15',
            }}>{item.s}</span>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📌 기능 가이드</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {FEATURES.map(feature => (
            <div
              key={feature.id}
              className="notion-card"
              style={{ padding: 18, cursor: 'pointer' }}
              onClick={() => onNavigate(feature.id)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: feature.color + '15',
                  color: feature.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {feature.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: 'var(--foreground)' }}>{feature.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 10 }}>{feature.desc}</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {feature.tips.map((tip, i) => (
                      <li key={i} style={{ fontSize: 11, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        <span style={{ color: feature.color, fontWeight: 700, flexShrink: 0 }}>·</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
