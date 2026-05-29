import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GitBranch,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Agenda, Decision, Task } from '../types';
import { useAppContext } from '../App';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import {
  buildExecutiveBrief,
  buildExecutiveContextPackPlan,
  createOutcome,
  createIssueFromSignal,
  createWorkspaceDraft,
  getDelegationDogfoodPackets,
  getExecutiveOsContextPackTemplate,
  getExecutiveOsKgRoadmap,
  getPmbokOperatingModel,
  getWorkspaceWritePlan,
  recommendPmbokGovernanceMode,
  type ExecApproval,
  type ExecIssue,
  type ExecSignal,
} from '../lib/execOs';

interface ExecutiveOSViewProps {
  tasks: Task[];
  agendas: Agenda[];
  decisions: Decision[];
}

const statusTone = {
  ready: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  watch: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  blocked: 'text-red-600 bg-red-500/10 border-red-500/20',
} as const;

const metricRows: Array<[string, keyof ReturnType<typeof buildExecutiveBrief>, LucideIcon]> = [
  ['Tasks', 'totalTasks', ListChecks],
  ['Blocked', 'blockedTasks', AlertTriangle],
  ['Agendas', 'openAgendas', FileText],
  ['Decisions', 'decisionCount', GitBranch],
  ['Signals', 'candidateSignals', ClipboardCheck],
];

const runtimeGate = {
  mcpStaleVerdict: 'OK' as const,
  staleProcesses: 0,
  freshProcesses: 3,
};

function makeSignals(tasks: Task[], agendas: Agenda[]): ExecSignal[] {
  const now = new Date().toISOString();
  const blockedTask = tasks.find(task => ['blocked', '막힘', '차단'].includes((task.status || '').toLowerCase()));
  const pendingAgenda = agendas.find(agenda => !['completed', 'done', 'closed', '완료'].includes((agenda.status || '').toLowerCase()));

  return [
    blockedTask && {
      id: `workspace-task-${blockedTask.id}`,
      sourceType: 'workspace',
      sourcePath: 'hallaon-website/src/App.tsx',
      domain: 'workspace',
      kind: 'blocked_task',
      summary: blockedTask.title || 'Blocked Workspace task',
      aggregateOnly: true,
      privacyLevel: 'P3',
      candidate: true,
      createdAt: now,
    },
    pendingAgenda && {
      id: `workspace-agenda-${pendingAgenda.id}`,
      sourceType: 'workspace',
      sourcePath: 'hallaon-website/src/components/AgendasView.tsx',
      domain: 'ops',
      kind: 'pending_agenda',
      summary: pendingAgenda.title || 'Pending agenda',
      aggregateOnly: true,
      privacyLevel: 'P3',
      candidate: true,
      createdAt: now,
    },
    {
      id: 'hrd-weekly-ritual',
      sourceType: 'hlo_org',
      sourcePath: '한라온 조직 시스템/산출물 v4/HRD_인적자원개발_프로그램.md',
      domain: 'hrd',
      kind: 'ritual_review',
      summary: 'HRD weekly ritual review',
      aggregateOnly: true,
      privacyLevel: 'P3',
      candidate: true,
      createdAt: now,
    },
  ].filter(Boolean) as ExecSignal[];
}

function getDraftTitle(draft: ReturnType<typeof createWorkspaceDraft>): string {
  if (draft.table === 'decisions') return draft.payload.best_choice || draft.payload.agenda_id;
  return draft.payload.title;
}

export const ExecutiveOSView = ({ tasks, agendas, decisions }: ExecutiveOSViewProps) => {
  const { optimisticAddAgenda, optimisticAddTask } = useAppContext();
  const { showToast } = useToast();
  const signals = useMemo(() => makeSignals(tasks, agendas), [tasks, agendas]);
  const issues = useMemo<ExecIssue[]>(() => signals.map(createIssueFromSignal), [signals]);
  const dogfoodPackets = useMemo(() => getDelegationDogfoodPackets(runtimeGate), []);
  const kgRoadmap = useMemo(() => getExecutiveOsKgRoadmap(), []);
  const pmbokModel = useMemo(() => getPmbokOperatingModel(), []);
  const brief = useMemo(
    () => buildExecutiveBrief({ tasks, agendas, decisions, signals }),
    [tasks, agendas, decisions, signals],
  );
  const governanceMode = useMemo(
    () =>
      recommendPmbokGovernanceMode({
        size: Math.min(5, Math.max(1, issues.length)),
        complexity: brief.blockedTasks > 0 ? 3 : 2,
        risk: issues.some(issue => issue.domain === 'hrd') ? 3 : 2,
        urgency: brief.blockedTasks > 0 ? 4 : 2,
        novelty: 3,
        privacySensitivity: issues.some(issue => issue.domain === 'hrd') ? 3 : 2,
        residentSafetyOrOpsAffected: brief.blockedTasks > 0,
      }),
    [brief.blockedTasks, issues],
  );
  const contextPack = useMemo(() => getExecutiveOsContextPackTemplate(), []);
  const contextPlan = useMemo(() => buildExecutiveContextPackPlan('AI Executive OS 만들기'), []);
  const [approvals, setApprovals] = useState<Record<string, ExecApproval>>({});
  const [writingIssueId, setWritingIssueId] = useState<string | null>(null);
  const [writtenTargets, setWrittenTargets] = useState<Record<string, string>>({});

  const approveIssue = (issue: ExecIssue, target: ExecApproval['target']) => {
    setApprovals(prev => ({
      ...prev,
      [issue.id]: {
        id: `approval-${issue.id}`,
        issueId: issue.id,
        approvedBy: 'workspace-user',
        approvalState: 'approved',
        target,
        createdAt: new Date().toISOString(),
      },
    }));
  };

  const writeDraft = async (issue: ExecIssue, approval: ExecApproval) => {
    const draft = createWorkspaceDraft(issue, approval);
    setWritingIssueId(issue.id);
    try {
      if (draft.table === 'agendas') {
        const { data, error } = await supabase.from('agendas').insert([draft.payload]).select().single();
        if (error) throw error;
        if (data) optimisticAddAgenda(data as Agenda);
        setWrittenTargets(prev => ({ ...prev, [issue.id]: `agendas.${data?.id || 'created'}` }));
      }
      if (draft.table === 'tasks') {
        const { data, error } = await supabase.from('tasks').insert([draft.payload]).select().single();
        if (error) throw error;
        if (data) optimisticAddTask(data as Task);
        setWrittenTargets(prev => ({ ...prev, [issue.id]: `tasks.${data?.id || 'created'}` }));
      }
      showToast('AI Executive OS draft saved to Workspace.', 'success');
    } catch (error) {
      console.error('AI Executive OS write-back failed:', error);
      showToast('AI Executive OS write-back failed.', 'error');
    } finally {
      setWritingIssueId(null);
    }
  };

  return (
    <div className="animate-fade-in px-4 py-6 md:py-8 max-w-[1240px] mx-auto space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck size={16} />
            <span>Workspace Control Layer</span>
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-normal">AI Executive OS</h1>
        </div>
        <div className={`inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${statusTone[brief.readiness]}`}>
          <Sparkles size={16} />
          <span>{brief.readiness.toUpperCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {metricRows.map(([label, key, Icon]) => (
          <div key={label} className="metric-card">
            <div className="flex items-center justify-between mb-2">
              <div className="metric-label">{label}</div>
              <Icon size={16} className="text-muted-foreground" />
            </div>
            <div className="metric-value">{brief[key]}</div>
          </div>
        ))}
      </div>

      <section className="notion-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">PMBOK Operating Layer</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {pmbokModel.minimumForms.length} MVP forms, {pmbokModel.gates.length} gates, {pmbokModel.workPackages.length} work packages
            </p>
          </div>
          <span className="w-fit rounded-sm bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            {governanceMode}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-4">
          <div className="space-y-2">
            {pmbokModel.minimumForms.map(form => (
              <div key={form.id} className="rounded-md border border-border bg-background px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{form.label}</div>
                  <span className="rounded-sm bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                    {form.mapsTo}
                  </span>
                </div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{form.rule}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pmbokModel.gates.map(gate => (
                <div key={gate.id} className="rounded-md border border-border bg-background px-3 py-3">
                  <div className="text-sm font-semibold">{gate.label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{gate.rule}</div>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">HRD Boundary</div>
                <span className="rounded-sm border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                  {pmbokModel.hrdBoundary.status}
                </span>
              </div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{pmbokModel.hrdBoundary.rule}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="notion-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Context Pack</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {contextPack.stages.length} stages, {contextPack.acceptanceGates.length} gates, {contextPack.workerLanes.length} worker lanes
            </p>
          </div>
          <span className="w-fit rounded-sm bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            {contextPack.status}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-4">
          <div className="space-y-2">
            {contextPack.stages.slice(0, 4).map(stage => (
              <div key={stage.stage} className="rounded-md border border-border bg-background px-3 py-3">
                <div className="text-sm font-semibold">{stage.stage}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">{stage.description}</div>
              </div>
            ))}
            <div className="rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
              +{contextPack.stages.length - 4} more stages
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {contextPack.acceptanceGates.map(gate => (
                <div key={gate} className="rounded-md border border-border bg-background px-3 py-3">
                  <div className="text-sm font-semibold">{gate}</div>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">HRD Boundary</div>
                <span className="rounded-sm border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                  draft-sensitive
                </span>
              </div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{contextPack.hrdBoundary}</div>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Execution Plan</div>
                <span className="rounded-sm border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                  code blocked
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-semibold">{contextPlan.retrievalTasks.length}</div>
                  <div className="text-muted-foreground">retrieval</div>
                </div>
                <div>
                  <div className="font-semibold">{contextPlan.council.length}</div>
                  <div className="text-muted-foreground">council</div>
                </div>
                <div>
                  <div className="font-semibold">{contextPlan.workerRoutes.length}</div>
                  <div className="text-muted-foreground">routes</div>
                </div>
                <div>
                  <div className="font-semibold">{contextPlan.qualityGates.length}</div>
                  <div className="text-muted-foreground">gates</div>
                </div>
              </div>
              <div className="mt-3 text-xs leading-5 text-muted-foreground">
                {contextPlan.approvalGate.reason}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-4">
        <section className="notion-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold">Issue Queue</h2>
            <span className="text-xs font-semibold text-muted-foreground">{issues.length} candidates</span>
          </div>
          <div className="space-y-3">
            {issues.map(issue => {
              const approval = approvals[issue.id];
              const plan = approval ? getWorkspaceWritePlan(approval) : null;
              const draft = approval && plan?.canWrite ? createWorkspaceDraft(issue, approval) : null;
              const outcome = approval ? createOutcome(issue, approval, draft ? 'drafted' : 'reviewed') : null;
              return (
                <div key={issue.id} className="rounded-md border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-sm bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                          {issue.domain}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{issue.severity}</span>
                      </div>
                      <h3 className="text-sm font-semibold truncate">{issue.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground truncate">{issue.evidence[0]?.sourcePath}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => approveIssue(issue, 'agenda')}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold hover:bg-secondary"
                      >
                        <FileText size={14} />
                        Agenda
                      </button>
                      <button
                        type="button"
                        onClick={() => approveIssue(issue, 'task')}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <ListChecks size={14} />
                        Task
                      </button>
                    </div>
                  </div>
                  {plan && (
                    <div className="mt-3 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>{plan.canWrite ? `Draft ready for ${draft?.table}` : plan.reason}</span>
                      </div>
                      {draft && (
                        <div className="mt-2 flex flex-col gap-2 pl-5 sm:flex-row sm:items-center sm:justify-between">
                          <span className="truncate">
                            {writtenTargets[issue.id] || `${draft.table}.${getDraftTitle(draft)}`}
                          </span>
                          {!writtenTargets[issue.id] && (
                            <button
                              type="button"
                              onClick={() => writeDraft(issue, approval)}
                              disabled={writingIssueId === issue.id}
                              className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <ClipboardCheck size={14} />
                              {writingIssueId === issue.id ? 'Saving' : 'Write'}
                            </button>
                          )}
                        </div>
                      )}
                      {outcome && (
                        <div className="mt-1 truncate pl-5">
                          {outcome.summary}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="notion-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold">HRD Loop</h2>
            <span className="rounded-sm border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-600">
              DRAFT
            </span>
          </div>
          <div className="space-y-3">
            {[
              ['Signal Boundary', 'Aggregate-only candidate review'],
              ['Ritual Check', `${brief.hrdSignals} HRD signal in queue`],
              ['Approval Mode', 'Human-gated Workspace write-back'],
              ['Outcome Review', 'Decision and task results stay auditable'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-3">
                <div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{value}</div>
                </div>
                <ShieldCheck size={16} className="mt-0.5 text-muted-foreground" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="notion-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">Delegation Dogfood</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              MCP gate: {runtimeGate.mcpStaleVerdict}, stale {runtimeGate.staleProcesses}, fresh {runtimeGate.freshProcesses}
            </p>
          </div>
          <span className="w-fit rounded-sm border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-600">
            {dogfoodPackets.every(packet => packet.status === 'ready') ? 'READY' : 'RUNTIME GATED'}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {dogfoodPackets.map(packet => (
            <div key={packet.provider} className="rounded-md border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase">{packet.provider}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{packet.model}</div>
                </div>
                <span className="rounded-sm bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {packet.mode}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{packet.task}</p>
              <div className="mt-3 text-[11px] font-semibold text-red-600">
                {packet.status}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="notion-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">KG Roadmap</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {kgRoadmap.nodes.length} nodes, {kgRoadmap.edges.length} edges, {kgRoadmap.shippingSlices.length} shipping slices
            </p>
          </div>
          <span className="w-fit rounded-sm bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            GRAPH-FIRST
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {kgRoadmap.nodes.map(node => (
              <div key={node.id} className="rounded-md border border-border bg-background px-3 py-2">
                <div className="text-xs font-semibold">{node.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{node.plane}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {kgRoadmap.shippingSlices.map((slice, index) => (
              <div key={slice} className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary font-semibold">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{slice}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
