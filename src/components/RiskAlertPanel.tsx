import React from 'react';
import { RiskAlert } from '../lib/riskDetector';
import { AlertTriangle, Clock, ShieldAlert, UserX } from 'lucide-react';
import { cn } from '../lib/utils';

interface RiskAlertPanelProps {
  risks: RiskAlert[];
}

const RISK_ICONS: Record<RiskAlert['type'], any> = {
  OVERDUE: Clock,
  DEADLINE_APPROACHING: AlertTriangle,
  BLOCKED_CRITICAL: ShieldAlert,
  ASSIGNEE_OVERLOAD: UserX,
};

const SEVERITY_STYLES: Record<RiskAlert['severity'], string> = {
  HIGH: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
  MEDIUM: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900',
  LOW: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900',
};

const SEVERITY_BADGE: Record<RiskAlert['severity'], string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  MEDIUM: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  LOW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
};

export const RiskAlertPanel = ({ risks }: RiskAlertPanelProps) => {
  if (risks.length === 0) {
    return (
      <div className="notion-card p-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ShieldAlert size={16} style={{ color: '#37B24D' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>리스크 알림</span>
        </div>
        <p className="text-sm text-muted-foreground">현재 감지된 리스크가 없습니다. 🎉</p>
      </div>
    );
  }

  return (
    <div className="notion-card p-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={16} style={{ color: '#E03E3E' }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>리스크 알림</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-bold">
          {risks.length}건
        </span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {risks.map((risk, i) => {
          const Icon = RISK_ICONS[risk.type] || AlertTriangle;
          return (
            <div
              key={`${risk.taskId}-${risk.type}-${i}`}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                SEVERITY_STYLES[risk.severity]
              )}
            >
              <Icon size={16} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{risk.message}</p>
              </div>
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0', SEVERITY_BADGE[risk.severity])}>
                {risk.severity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
