import type { Agenda, Decision, Task } from '../types';

export type ExecDomain = 'ops' | 'hrd' | 'onboarding' | 'brain' | 'feedback' | 'community' | 'workspace' | 'pmbok';
export type ProductCategory = 'executive_os' | 'hallaon_ops' | 'saas' | 'commerce' | 'unknown';

export interface RoughExecutiveGoalInterpretation {
  rawGoal: string;
  normalizedGoal: string;
  productCategory: ProductCategory;
  likelyIntent: string;
  contextPackRequired: true;
  firstStage: string;
  requiredRetrieval: ReadonlyArray<string>;
  councilRequired: true;
  approvalRequiredBeforeExecution: true;
  suggestedNextAction: string;
  blockedDirectCodingReason: string;
}
export type ExecPrivacyLevel = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type ExecSourceType = 'deep_report' | 'hlo_org' | 'archive' | 'workspace' | 'tamna' | 'bot' | 'manual';
export type ExecIssueStatus = 'candidate' | 'accepted' | 'rejected' | 'agenda_created' | 'closed';
export type ExecTarget = 'agenda' | 'decision' | 'task' | 'outcome' | 'hrd_ritual';

export interface ExecSignal {
  id: string;
  sourceType: ExecSourceType;
  sourcePath: string;
  domain: ExecDomain;
  kind: string;
  summary: string;
  aggregateOnly: boolean;
  privacyLevel: ExecPrivacyLevel;
  candidate: boolean;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface ExecEvidence {
  id: string;
  issueId: string;
  sourceType: ExecSourceType;
  sourcePath: string;
  kind: 'path' | 'rule' | 'metric' | 'event' | 'manual_note';
  text: string;
}

export interface ExecIssue {
  id: string;
  title: string;
  status: ExecIssueStatus;
  domain: ExecDomain;
  severity: 'info' | 'watch' | 'minor' | 'major' | 'critical';
  summary: string;
  createdFromSignalId: string;
  evidence: ExecEvidence[];
}

export interface ExecApproval {
  id: string;
  issueId: string;
  approvedBy?: string;
  approvalState: 'pending' | 'approved' | 'rejected';
  target: ExecTarget;
  createdAt: string;
}

export interface ExecOutcome {
  id: string;
  issueId: string;
  target: ExecTarget;
  status: 'drafted' | 'written' | 'reviewed';
  summary: string;
  createdAt: string;
}

export interface ExecutiveBriefInput {
  tasks: Task[];
  agendas: Agenda[];
  decisions: Decision[];
  signals: ExecSignal[];
}

export interface ExecutiveBrief {
  totalTasks: number;
  blockedTasks: number;
  openAgendas: number;
  decisionCount: number;
  candidateSignals: number;
  hrdSignals: number;
  readiness: 'ready' | 'watch' | 'blocked';
}

export interface SignalBoundaryResult {
  ok: boolean;
  reason?: string;
}

export interface WorkspaceWritePlan {
  canWrite: boolean;
  table?: 'agendas' | 'decisions' | 'tasks';
  requiresHumanApproval: true;
  reason?: string;
}

export interface DelegationRuntimeGate {
  mcpStaleVerdict: 'OK' | 'NEEDS_USER_DECISION' | 'BLOCKED' | 'CRITICAL';
  staleProcesses: number;
  freshProcesses: number;
}

export interface DelegationDogfoodPacket {
  provider: 'ssu' | 'kimi' | 'deepseek';
  model: string;
  role: string;
  task: string;
  expectedOutput: string;
  mode: 'audit' | 'controlled_patch' | 'patch_plan';
  status: 'ready' | 'blocked_by_stale_runtime_gate';
  allowedWriteGlobs?: string[];
  verification: string[];
}

export interface ExecKgNode {
  id: string;
  label: string;
  plane: 'knowledge' | 'signal' | 'decision' | 'execution' | 'hrd';
}

export interface ExecKgEdge {
  from: string;
  to: string;
  relation: string;
}

export interface ExecKgRoadmap {
  nodes: ExecKgNode[];
  edges: ExecKgEdge[];
  shippingSlices: string[];
}

export type PmbokGovernanceMode = 'lightweight' | 'standard' | 'high-governance' | 'emergency';

export interface PmbokOperatingPrinciple {
  id: string;
  label: string;
  policy: string;
  humanHeld: string;
}

export interface PmbokPerformanceDomain {
  id: string;
  label: string;
  module: string;
  rule: string;
}

export interface PmbokArtifact {
  id: string;
  label: string;
  purpose: string;
  mvp: boolean;
}

export interface PmbokMinimumForm {
  id: string;
  label: string;
  mapsTo: string;
  rule: string;
}

export interface PmbokGate {
  id: string;
  label: string;
  rule: string;
  automationBoundary: string;
}

export interface PmbokTailoringInput {
  size: number;
  complexity: number;
  risk: number;
  urgency: number;
  novelty: number;
  privacySensitivity: number;
  irreversible?: boolean;
  residentSafetyOrOpsAffected?: boolean;
}

export interface PmbokOperatingModel {
  basis: string;
  principles: PmbokOperatingPrinciple[];
  performanceDomains: PmbokPerformanceDomain[];
  artifacts: PmbokArtifact[];
  minimumForms: PmbokMinimumForm[];
  gates: PmbokGate[];
  workPackages: Array<{
    id: string;
    title: string;
    lane: 'Codex orchestrator' | 'Kimi implementation' | 'DeepSeek audit' | 'SSU reducer';
    deps: string[];
    description: string;
  }>;
  hrdBoundary: {
    status: 'draft-sensitive';
    rule: string;
    allowed: string[];
    forbidden: string[];
  };
  excludedForMvp: string[];
}

export type WorkspaceDraft =
  | {
      table: 'agendas';
      payload: Pick<Agenda, 'title' | 'proposer' | 'team' | 'status' | 'proposed_date' | 'is_sent' | 'content'>;
    }
  | {
      table: 'tasks';
      payload: Pick<Task, 'title' | 'assignee' | 'team' | 'status' | 'start_date' | 'end_date' | 'wbs_code' | 'opt_time' | 'prob_time' | 'pess_time' | 'exp_time' | 'is_sent' | 'content'>;
    }
  | {
      table: 'decisions';
      payload: Pick<Decision, 'agenda_id' | 'criteria' | 'alternatives' | 'best_choice'>;
    };

const WORKSPACE_WRITE_TABLE: Partial<Record<ExecTarget, 'agendas' | 'decisions' | 'tasks'>> = {
  agenda: 'agendas',
  decision: 'decisions',
  task: 'tasks',
};

const completedStatuses = new Set(['completed', 'done', 'closed', '완료']);
const blockedStatuses = new Set(['blocked', 'stuck', '막힘', '차단']);

function normalizeStatus(status: string | undefined): string {
  return (status || '').trim().toLowerCase();
}

function isBlockedTask(task: Task): boolean {
  return blockedStatuses.has(normalizeStatus(task.status));
}

function isOpenAgenda(agenda: Agenda): boolean {
  return !completedStatuses.has(normalizeStatus(agenda.status));
}

export function evaluateSignalBoundary(signal: ExecSignal): SignalBoundaryResult {
  if (!signal.candidate) {
    return { ok: false, reason: 'Only candidate signals can enter AI Executive OS review.' };
  }

  if (signal.domain === 'hrd' && !signal.aggregateOnly) {
    return { ok: false, reason: 'HRD signals must remain aggregate-only.' };
  }

  if (signal.privacyLevel === 'P5' && signal.sourceType !== 'workspace') {
    return { ok: false, reason: 'P5 signals require Workspace-owned review before import.' };
  }

  return { ok: true };
}

export function createIssueFromSignal(signal: ExecSignal): ExecIssue {
  const boundary = evaluateSignalBoundary(signal);
  if (!boundary.ok) {
    throw new Error(boundary.reason || 'Signal boundary rejected.');
  }

  const issueId = `issue-${signal.id}`;
  return {
    id: issueId,
    title: signal.summary,
    status: 'candidate',
    domain: signal.domain,
    severity: signal.domain === 'hrd' ? 'watch' : 'info',
    summary: signal.summary,
    createdFromSignalId: signal.id,
    evidence: [
      {
        id: `evidence-${signal.id}`,
        issueId,
        sourceType: signal.sourceType,
        sourcePath: signal.sourcePath,
        kind: signal.sourceType === 'manual' ? 'manual_note' : 'event',
        text: signal.summary,
      },
    ],
  };
}

export function buildExecutiveBrief(input: ExecutiveBriefInput): ExecutiveBrief {
  const totalTasks = input.tasks.length;
  const blockedTasks = input.tasks.filter(isBlockedTask).length;
  const openAgendas = input.agendas.filter(isOpenAgenda).length;
  const candidateSignals = input.signals.filter(signal => signal.candidate).length;
  const hrdSignals = input.signals.filter(signal => signal.domain === 'hrd').length;

  return {
    totalTasks,
    blockedTasks,
    openAgendas,
    decisionCount: input.decisions.length,
    candidateSignals,
    hrdSignals,
    readiness: blockedTasks > 0 ? 'blocked' : openAgendas > 0 || candidateSignals > 0 ? 'watch' : 'ready',
  };
}

export function getWorkspaceWritePlan(approval: ExecApproval): WorkspaceWritePlan {
  const table = WORKSPACE_WRITE_TABLE[approval.target];
  if (!table) {
    return {
      canWrite: false,
      requiresHumanApproval: true,
      reason: 'Target stays inside AI Executive OS and does not write to Workspace tables.',
    };
  }

  if (approval.approvalState !== 'approved' || !approval.approvedBy) {
    return {
      canWrite: false,
      table,
      requiresHumanApproval: true,
      reason: 'Workspace write-back requires explicit human approval.',
    };
  }

  return {
    canWrite: true,
    table,
    requiresHumanApproval: true,
  };
}

export function createWorkspaceDraft(issue: ExecIssue, approval: ExecApproval, now = new Date()): WorkspaceDraft {
  const plan = getWorkspaceWritePlan(approval);
  if (!plan.canWrite || !plan.table) {
    throw new Error(plan.reason || 'Workspace draft requires an approved write plan.');
  }

  const content = {
    executive_os: true,
    issue_id: issue.id,
    issue_domain: issue.domain,
    evidence: issue.evidence.map(item => ({
      source_type: item.sourceType,
      source_path: item.sourcePath,
      text: item.text,
    })),
    approval_id: approval.id,
    approved_by: approval.approvedBy,
  };

  if (plan.table === 'agendas') {
    return {
      table: 'agendas',
      payload: {
        title: issue.title,
        proposer: 'AI Executive OS',
        team: issue.domain.toUpperCase(),
        status: 'pending',
        proposed_date: now.toISOString().slice(0, 10),
        is_sent: false,
        content,
      },
    };
  }

  if (plan.table === 'tasks') {
    const date = now.toISOString().slice(0, 10);
    return {
      table: 'tasks',
      payload: {
        title: issue.title,
        assignee: 'Unassigned',
        team: issue.domain.toUpperCase(),
        status: 'pending',
        start_date: date,
        end_date: date,
        wbs_code: `EXEC-${issue.id.slice(0, 8)}`,
        opt_time: 1,
        prob_time: 1,
        pess_time: 2,
        exp_time: 1.17,
        is_sent: false,
        content,
      },
    };
  }

  return {
    table: 'decisions',
    payload: {
      agenda_id: issue.id,
      criteria: {
        source: 'AI Executive OS',
        evidence_required: true,
        human_approved: true,
      },
      alternatives: {
        approve: issue.summary,
        defer: 'Keep issue in review queue',
      },
      best_choice: issue.summary,
    },
  };
}

export function createOutcome(issue: ExecIssue, approval: ExecApproval, status: ExecOutcome['status']): ExecOutcome {
  return {
    id: `outcome-${approval.id}`,
    issueId: issue.id,
    target: approval.target,
    status,
    summary: `${approval.target} ${status} for ${issue.title}`,
    createdAt: new Date().toISOString(),
  };
}

export function recommendPmbokGovernanceMode(input: PmbokTailoringInput): PmbokGovernanceMode {
  if (input.privacySensitivity >= 4 || input.irreversible) return 'high-governance';
  if (input.urgency >= 4 && input.residentSafetyOrOpsAffected) return 'emergency';
  if (input.size <= 2 && input.complexity <= 2 && input.risk <= 2 && input.novelty <= 2) return 'lightweight';
  return 'standard';
}

export interface AgendaRiskHeuristic {
  rawScore: number;
  cappedScore: number;
  tier: 'low' | 'medium' | 'high' | 'mandatory-human';
  requiresHumanAgenda: boolean;
  automationCapped: boolean;
  rationale: string;
  boundedDisclaimer: string;
}

export function scoreAgendaRiskHeuristic(issue: ExecIssue): AgendaRiskHeuristic {
  const boundedDisclaimer = 'Bounded prioritization heuristic for agenda triage. Not objective truth. Human approval remains required for all write-back.';

  // Personnel automation cap: HRD domain is rejected from automated agenda creation
  if (issue.domain === 'hrd') {
    return {
      rawScore: 0,
      cappedScore: 0,
      tier: 'mandatory-human',
      requiresHumanAgenda: true,
      automationCapped: true,
      rationale: 'HRD domain is aggregate-only and personnel-related. Automated agenda creation is rejected; human ownership required.',
      boundedDisclaimer,
    };
  }

  // Severity baseline scoring
  const severityPoints: Record<string, number> = {
    info: 10,
    watch: 30,
    minor: 50,
    major: 75,
    critical: 95,
  };
  let rawScore = severityPoints[issue.severity] ?? 10;

  // Privacy/legal risk indicators in title, summary, and evidence
  const fullText = [
    issue.title,
    issue.summary,
    ...issue.evidence.map(e => e.text),
  ].join(' ').toLowerCase();

  const hasPrivacyRisk = /privacy|legal|gdpr|p5|personnel|resident data|individual/.test(fullText);
  if (hasPrivacyRisk) {
    rawScore = Math.max(rawScore, 50) + 25;
  }

  // Absolute cap to prevent automation overconfidence
  const cappedScore = Math.min(rawScore, 95);

  // High privacy/legal risk forces mandatory human agenda behavior
  if (hasPrivacyRisk && cappedScore >= 70) {
    return {
      rawScore,
      cappedScore: Math.min(cappedScore, 80),
      tier: 'mandatory-human',
      requiresHumanAgenda: true,
      automationCapped: true,
      rationale: 'High privacy/legal risk candidate detected. Automation capped at 80; human agenda ownership required.',
      boundedDisclaimer,
    };
  }

  let tier: AgendaRiskHeuristic['tier'] = 'low';
  if (cappedScore >= 70) tier = 'high';
  else if (cappedScore >= 40) tier = 'medium';

  return {
    rawScore,
    cappedScore,
    tier,
    requiresHumanAgenda: true,
    automationCapped: false,
    rationale: `Severity-based score ${cappedScore}/95. ${tier} priority candidate.`,
    boundedDisclaimer,
  };
}

export function getPmbokOperatingModel(): PmbokOperatingModel {
  return {
    basis: 'PMBOK as HallaOn operating rules, approval gates, artifact schema, scoring, and work decomposition.',
    principles: [
      {
        id: 'stewardship',
        label: 'Stewardship',
        policy: 'Resident-facing decisions keep rationale, evidence, approver, and affected segment.',
        humanHeld: 'Final approval and policy or budget interpretation',
      },
      {
        id: 'stakeholders',
        label: 'Stakeholders',
        policy: 'Stakeholders are modeled as k-anonymous segments, not hidden individual profiles.',
        humanHeld: 'Sensitive communication and segment interpretation',
      },
      {
        id: 'tailoring',
        label: 'Tailoring',
        policy: 'Each initiative is lightweight, standard, high-governance, or emergency.',
        humanHeld: 'Mode override and exception approval',
      },
      {
        id: 'risk',
        label: 'Risk',
        policy: 'Every meaningful risk receives an owner, response strategy, and residual risk note.',
        humanHeld: 'Accept, mitigate, avoid, or escalate choices',
      },
      {
        id: 'change',
        label: 'Change',
        policy: 'Resident-facing change creates a change request and impact trace.',
        humanHeld: 'Tier 2 or higher approval',
      },
    ],
    performanceDomains: [
      {
        id: 'stakeholders',
        label: 'Stakeholders',
        module: 'Stakeholder Graph',
        rule: 'Route by segment sensitivity, urgency, and channel fit.',
      },
      {
        id: 'planning',
        label: 'Planning',
        module: 'Charter/WBS/Baseline',
        rule: 'Execution is limited when purpose, scope, schedule, budget, or KPI baseline is missing.',
      },
      {
        id: 'project_work',
        label: 'Project Work',
        module: 'Work Package & Task Engine',
        rule: 'Tasks cannot close without evidence linkage.',
      },
      {
        id: 'measurement',
        label: 'Measurement',
        module: 'Executive Brief & Benefits Engine',
        rule: 'Benefits show baseline, target, variance, and confidence instead of vanity metrics.',
      },
      {
        id: 'uncertainty',
        label: 'Uncertainty',
        module: 'RAID Engine',
        rule: 'Unresolved risks, assumptions, issues, and dependencies rise into agenda candidates.',
      },
    ],
    artifacts: [
      {
        id: 'initiative_charter',
        label: 'Initiative Charter',
        purpose: 'Lock purpose, owner, governance mode, scope, schedule, budget, and KPI baseline.',
        mvp: true,
      },
      {
        id: 'decision_log',
        label: 'Decision Log',
        purpose: 'Preserve options, selected choice, rationale, approver, dissent note, and evidence.',
        mvp: true,
      },
      {
        id: 'raid_register',
        label: 'RAID Register',
        purpose: 'Track risks, assumptions, issues, dependencies, owner, response, and residual state.',
        mvp: true,
      },
      {
        id: 'work_package',
        label: 'Work Package',
        purpose: 'Convert approved decisions into deliverables, tasks, dependencies, and proof of done.',
        mvp: true,
      },
      {
        id: 'lessons_learned',
        label: 'Lessons Learned',
        purpose: 'Feed outcomes and failures back into future rules, gates, and playbooks.',
        mvp: true,
      },
    ],
    minimumForms: [
      {
        id: 'project_initiation',
        label: 'Project Initiation',
        mapsTo: 'initiative_charter',
        rule: 'No execution without purpose, owner, governance mode, scope, schedule, budget, and KPI baseline.',
      },
      {
        id: 'expected_benefits',
        label: 'Expected Benefits',
        mapsTo: 'initiative_charter',
        rule: 'Benefits carry baseline, target, confidence, and review cadence.',
      },
      {
        id: 'stakeholder_segment_channel',
        label: 'Stakeholder Segment / Channel',
        mapsTo: 'stakeholders',
        rule: 'Stakeholders stay as k-anonymous segments with channel and concern notes.',
      },
      {
        id: 'decision_memo',
        label: 'Decision Memo',
        mapsTo: 'decision_log',
        rule: 'Every decision keeps options, rationale, approver, evidence, and dissent note when present.',
      },
      {
        id: 'change_request',
        label: 'Change Request',
        mapsTo: 'change',
        rule: 'Resident-facing scope, schedule, budget, or policy changes leave an impact trace.',
      },
      {
        id: 'raid_register',
        label: 'RAID',
        mapsTo: 'raid_register',
        rule: 'Risks, assumptions, issues, and dependencies have owner, response, due date, and residual state.',
      },
      {
        id: 'work_package',
        label: 'Work Package',
        mapsTo: 'work_package',
        rule: 'Approved decisions decompose into deliverables, dependencies, acceptance criteria, and proof of done.',
      },
      {
        id: 'weekly_executive_brief',
        label: 'Weekly Executive Brief',
        mapsTo: 'measurement',
        rule: 'Weekly brief summarizes top signals, risks, blocked tasks, decisions needed, and benefit variance.',
      },
      {
        id: 'lessons_learned',
        label: 'Lessons Learned',
        mapsTo: 'lessons_learned',
        rule: 'Outcomes and failures update rules, gates, and future work packages.',
      },
    ],
    gates: [
      {
        id: 'privacy_gate',
        label: 'Privacy Gate',
        rule: 'P5 or individual-sensitive signals stay out until Workspace-owned review.',
        automationBoundary: 'Reject import or produce a candidate summary only.',
      },
      {
        id: 'human_approval_gate',
        label: 'Human Approval Gate',
        rule: 'Workspace write-back requires explicit approval and approver identity.',
        automationBoundary: 'Draft agendas, decisions, or tasks without final authority.',
      },
      {
        id: 'evidence_gate',
        label: 'Evidence Gate',
        rule: 'Decision and task close require linked evidence.',
        automationBoundary: 'Block close or raise agenda candidate.',
      },
      {
        id: 'tailoring_gate',
        label: 'Tailoring Gate',
        rule: 'Privacy, irreversibility, urgency, complexity, and risk choose governance mode.',
        automationBoundary: 'Recommend mode; humans may override.',
      },
    ],
    workPackages: [
      {
        id: 'WP1',
        title: 'PMBOK Operating Rules & Logic',
        lane: 'Codex orchestrator',
        deps: [],
        description: 'Define artifact scoring, gate transition logic, and delegation rules for initiation and benefits tracking.',
      },
      {
        id: 'WP2',
        title: 'MVP Form Schema Factory',
        lane: 'Kimi implementation',
        deps: ['WP1'],
        description: 'Implement schemas or templates for the nine MVP forms without creating personnel automation.',
      },
      {
        id: 'WP3',
        title: 'Work Package State Machine',
        lane: 'Kimi implementation',
        deps: ['WP1'],
        description: 'Track work package lifecycle and evidence-required close behavior.',
      },
      {
        id: 'WP4',
        title: 'HRD Ritual Loop Logic',
        lane: 'Codex orchestrator',
        deps: ['WP2'],
        description: 'Keep HRD as draft-sensitive aggregate ritual reporting with no individual resident profiling.',
      },
      {
        id: 'WP5',
        title: 'Governance Audit Interface',
        lane: 'DeepSeek audit',
        deps: ['WP1', 'WP2'],
        description: 'Audit decision memo, change request, RAID, privacy, and approval trail coverage.',
      },
      {
        id: 'WP6',
        title: 'Weekly Brief Reducer',
        lane: 'SSU reducer',
        deps: ['WP3'],
        description: 'Compress weekly executive brief inputs and historical logs for context-safe executive review.',
      },
      {
        id: 'WP7',
        title: 'Workspace Command Wrapper',
        lane: 'Codex orchestrator',
        deps: ['WP3', 'WP5'],
        description: 'Integrate approved form and gate outputs into Workspace write-back commands.',
      },
    ],
    hrdBoundary: {
      status: 'draft-sensitive',
      rule: 'HRD enters AI Executive OS only as aggregate ritual signals and governance-reviewed learning loops.',
      allowed: [
        'aggregate weekly ritual completion',
        'team-level capability and onboarding gaps',
        'draft recommendations for human review',
      ],
      forbidden: [
        'individual resident profiling',
        'automated personnel decisions',
        'raw P5 import outside Workspace-owned review',
      ],
    },
    excludedForMvp: [
      'full earned value management',
      'enterprise procurement documentation',
      'individual resident profiling',
      'automated personnel decisions',
      'advanced RDF reasoning kernel',
    ],
  };
}

export function getDelegationDogfoodPackets(gate: DelegationRuntimeGate): DelegationDogfoodPacket[] {
  const status: DelegationDogfoodPacket['status'] =
    gate.mcpStaleVerdict === 'OK' && gate.staleProcesses === 0
      ? 'ready'
      : 'blocked_by_stale_runtime_gate';

  return [
    {
      provider: 'ssu',
      model: 'ssu-gateway',
      role: 'internal orchestrator',
      task: 'Break AI-EXECUTIVE-OS-WORKSPACE-HRD-PMBOK-MVP0 into PMBOK artifacts, schema, domain, UI, write-back, HRD safety, verification, and handoff cycles.',
      expectedOutput: 'Cycle DAG with PMBOK artifact dependencies, stop gates, provider assignment, and reducer notes.',
      mode: 'audit',
      status,
      verification: [
        'cycle DAG covers PMBOK artifacts/schema/domain/UI/write-back/HRD/verification',
        'SSU remains advisory-only',
        'no binding routing or source mutation',
      ],
    },
    {
      provider: 'kimi',
      model: 'kimi-k2.6',
      role: 'implementation worker',
      task: 'Patch the bounded Workspace AI Executive OS PMBOK operating model slice while preserving dirty baseline and exact-file scope.',
      expectedOutput: 'Patch proposal with smoke/build evidence and no edits outside approved paths.',
      mode: 'controlled_patch',
      status,
      allowedWriteGlobs: [
        'hallaon-website/src/lib/execOs.ts',
        'hallaon-website/src/components/ExecutiveOSView.tsx',
        'hallaon-website/scripts/exec-os-smoke.ts',
        'output/reports/AI-EXECUTIVE-OS-COMPILER0/pmbok-operating-model.json',
      ],
      verification: [
        'npx tsx scripts/exec-os-smoke.ts',
        'npm run lint -- --pretty false',
        'npm run build',
      ],
    },
    {
      provider: 'deepseek',
      model: 'deepseek-v4-pro',
      role: 'architecture and policy reviewer',
      task: 'Review PMBOK tailoring, HRD draft-sensitive integration, Workspace/Tamna separation, evidence contract, and approval write-back safety.',
      expectedOutput: 'Findings with severity, source paths, and required fixes before migration or deploy.',
      mode: 'audit',
      status,
      verification: [
        'schema static test forbids Tamna-only tables',
        'HRD remains aggregate-only',
        'human approval required before write-back',
      ],
    },
  ];
}

export function getExecutiveOsKgRoadmap(): ExecKgRoadmap {
  return {
    nodes: [
      { id: 'source', label: 'Source', plane: 'knowledge' },
      { id: 'signal', label: 'Signal', plane: 'signal' },
      { id: 'issue', label: 'Issue', plane: 'decision' },
      { id: 'evidence', label: 'Evidence', plane: 'knowledge' },
      { id: 'rule', label: 'Rule', plane: 'knowledge' },
      { id: 'pmbok_principle', label: 'PMBOK Principle', plane: 'knowledge' },
      { id: 'pmbok_artifact', label: 'PMBOK Artifact', plane: 'knowledge' },
      { id: 'raid_item', label: 'RAID Item', plane: 'decision' },
      { id: 'scenario', label: 'Scenario', plane: 'decision' },
      { id: 'approval', label: 'Approval', plane: 'decision' },
      { id: 'decision', label: 'Decision', plane: 'decision' },
      { id: 'work_package', label: 'Work Package', plane: 'execution' },
      { id: 'task', label: 'Task', plane: 'execution' },
      { id: 'outcome', label: 'Outcome', plane: 'execution' },
      { id: 'lesson', label: 'Lesson Learned', plane: 'knowledge' },
      { id: 'hrd_ritual_log', label: 'HRD Ritual Log', plane: 'hrd' },
    ],
    edges: [
      { from: 'source', to: 'signal', relation: 'emits' },
      { from: 'signal', to: 'issue', relation: 'raises' },
      { from: 'issue', to: 'evidence', relation: 'requires' },
      { from: 'evidence', to: 'rule', relation: 'is checked against' },
      { from: 'rule', to: 'pmbok_principle', relation: 'implements' },
      { from: 'pmbok_principle', to: 'pmbok_artifact', relation: 'requires' },
      { from: 'issue', to: 'raid_item', relation: 'can become' },
      { from: 'raid_item', to: 'scenario', relation: 'frames' },
      { from: 'rule', to: 'scenario', relation: 'frames' },
      { from: 'scenario', to: 'approval', relation: 'asks for' },
      { from: 'approval', to: 'decision', relation: 'permits' },
      { from: 'decision', to: 'work_package', relation: 'decomposes into' },
      { from: 'work_package', to: 'task', relation: 'contains' },
      { from: 'decision', to: 'task', relation: 'creates' },
      { from: 'task', to: 'outcome', relation: 'produces' },
      { from: 'outcome', to: 'lesson', relation: 'creates' },
      { from: 'lesson', to: 'rule', relation: 'updates' },
      { from: 'outcome', to: 'hrd_ritual_log', relation: 'feeds' },
      { from: 'hrd_ritual_log', to: 'signal', relation: 'loops back as aggregate signal' },
    ],
    shippingSlices: [
      'executive-os Workspace tab',
      'read-only executive brief',
      'issue queue from candidate and aggregate evidence',
      'human approval gate',
      'Workspace draft/write-back path',
      'HRD ritual panel with aggregate-safe state',
      'delegation-runtime dogfood packet panel',
      'PMBOK operating model panel',
      'RAID and work package decomposition layer',
    ],
  };
}

export interface ExecutiveOsContextPackStage {
  stage: string;
  description: string;
}

export interface ExecutiveOsContextPackTemplate {
  cycleId: string;
  status: string;
  purpose: string;
  stages: ExecutiveOsContextPackStage[];
  acceptanceGates: string[];
  hrdBoundary: string;
  workerLanes: string[];
  dogfoodNotes: string;
}

export function getExecutiveOsContextPackTemplate(): ExecutiveOsContextPackTemplate {
  return {
    cycleId: 'AI-EXECUTIVE-OS-COMPILER0',
    status: 'DRAFT',
    purpose: 'rough user goal -> bounded context pack before coding',
    stages: [
      {
        stage: 'rough_goal_interpretation',
        description: 'Parse natural-language user intent into structured goal statements and constraints.',
      },
      {
        stage: 'memory_kg_hlo_retrieval',
        description: 'Query memory, knowledge graph, and HLO artifacts for relevant historical context.',
      },
      {
        stage: 'research_registry',
        description: 'Identify and register external sources, APIs, or docs required for the task.',
      },
      {
        stage: 'persona_council',
        description: 'Invoke specialist personas to review goal, risks, and approach before execution.',
      },
      {
        stage: 'pmo_plan',
        description: 'Produce a bounded project plan with milestones, dependencies, and exit criteria.',
      },
      {
        stage: 'worker_routing',
        description: 'Assign work packets to appropriate worker lanes based on capability and cost.',
      },
      {
        stage: 'browser_tool_verification',
        description: 'Validate external facts or URLs via browser tools before ingestion into context.',
      },
      {
        stage: 'quality_gates',
        description: 'Enforce acceptance criteria, style checks, and security review before writeback.',
      },
      {
        stage: 'learning_writeback',
        description: 'Capture outcomes, failures, and metrics for feedback into memory and tuning.',
      },
    ],
    acceptanceGates: [
      'reject_direct_coding_before_context_pack',
      'human_approval_before_workspace_writeback',
      'privacy_security_slop_eval_browser_before_v1',
    ],
    hrdBoundary: 'draft-sensitive, aggregate-only, no automated personnel decisions',
    workerLanes: [
      'Codex orchestrator',
      'SSU reducer',
      'DeepSeek audit/research',
      'Kimi implementation',
      'cheap lanes validation',
    ],
    dogfoodNotes:
      'Kimi broad controlled_patch cost_preflight failure run_id 742ade68ffc9433bb1d77a596e922982 indicates that large, unbounded patch packets exceed cost and context limits; smaller, scoped packets are required for reliable execution.',
  };
}

const REQUIRED_RETRIEVAL: ReadonlyArray<string> = ['memory', 'kg', 'hlo_org', 'research_registry'];

function classifyProductCategory(input: string): ProductCategory {
  const lower = input.toLowerCase();
  const includesAny = (needles: ReadonlyArray<string>) =>
    needles.some(needle => lower.includes(needle.toLowerCase()));

  if (
    /ai\s*executive\s*os/i.test(input) ||
    /executive\s*os/i.test(input) ||
    includesAny(['ai 임원', 'ai 운영 체계', 'ai 운영체계'])
  ) {
    return 'executive_os';
  }

  if (
    /q-boost/i.test(input) ||
    /product\s*page/i.test(input) ||
    /commerce/i.test(input) ||
    includesAny(['상품 페이지', '제품 페이지', '판매', '결제'])
  ) {
    return 'commerce';
  }

  if (/saas/i.test(input) || includesAny(['서비스형 소프트웨어', '구독 모델', '서비스 제공'])) {
    return 'saas';
  }

  if (
    /task\s*management/i.test(input) ||
    /hallaon.*ops/i.test(input) ||
    includesAny(['한라온', '자율회', '할 일', '할일', '업무 관리', '작업 관리', '워크스페이스', '일정 관리'])
  ) {
    return 'hallaon_ops';
  }

  const executiveOsPatterns = [
    /ai\s*executive\s*os/i,
    /ai\s*임원/i,
    /ai\s*운영체제/i,
    /executive\s*os/i,
  ];
  if (executiveOsPatterns.some(p => p.test(lower))) return 'executive_os';

  const hallaonOpsPatterns = [
    /할\s*일\s*관리/,
    /작업\s*관리/,
    /태스크\s*관리/,
    /task\s*management/i,
    /hallaon.*ops/i,
    /워크스페이스/,
    /일정\s*관리/,
  ];
  if (hallaonOpsPatterns.some(p => p.test(lower))) return 'hallaon_ops';

  const saasPatterns = [
    /saas/i,
    /서비스형\s*소프트웨어/,
    /구독\s*모델/,
    /saas\s*로/,
    /서비스\s*제공/,
  ];
  if (saasPatterns.some(p => p.test(lower))) return 'saas';

  const commercePatterns = [
    /상품\s*페이지/,
    /제품\s*페이지/,
    /쇼핑몰/,
    /product\s*page/i,
    /commerce/i,
    /q-boost/i,
    /판매/,
  ];
  if (commercePatterns.some(p => p.test(lower))) return 'commerce';

  return 'unknown';
}

function buildLikelyIntent(input: string, category: ProductCategory): string {
  switch (category) {
    case 'executive_os':
      return 'Build or configure an AI-driven executive operating system layer that ingests signals, enforces governance gates, and enables human-in-the-loop decision workflows.';
    case 'hallaon_ops':
      return 'Create or extend a HallaOn workspace management feature — task tracking, agenda handling, or operations automation within the existing platform.';
    case 'saas':
      return 'Package a feature or page into a multi-tenant SaaS offering, implying billing, auth, onboarding, and subscription lifecycle.';
    case 'commerce':
      return 'Build a product showcase or commerce page, possibly with catalog, cart, checkout, or payment integration concerns.';
    default:
      return `Unrecognized goal pattern. The raw input "${input}" does not map cleanly to a known HallaOn domain. Context pack retrieval is still required to avoid hallucinated execution.`;
  }
}

function buildFirstStage(category: ProductCategory): string {
  switch (category) {
    case 'executive_os':
      return 'rough_goal_interpretation — parse the goal into structured signal/issue/approval flows, then proceed to memory/KG/HLO retrieval.';
    case 'hallaon_ops':
      return 'rough_goal_interpretation — decompose the ops request into domain (agenda/task/decision) and identify affected Workspace tables.';
    case 'saas':
      return 'rough_goal_interpretation — scope the SaaS boundary: tenant model, auth provider, billing integration, and landing page architecture.';
    case 'commerce':
      return 'rough_goal_interpretation — identify commerce surface (product page, catalog, or checkout) and required data sources.';
    default:
      return 'rough_goal_interpretation — attempt domain classification before any retrieval or coding.';
  }
}

function buildSuggestedNextAction(category: ProductCategory): string {
  switch (category) {
    case 'executive_os':
      return 'Queue a context pack build: retrieve memory traces, KG subgraph, HLO org artifacts, and external research. Then convene persona council.';
    case 'hallaon_ops':
      return 'Open a Workspace-scoped retrieval: pull relevant agendas/tasks/decisions from memory, cross-reference KG, and schedule council review.';
    case 'saas':
      return 'Gather SaaS boilerplate requirements (auth, tenant, billing) from research_registry, then route to council for architecture review.';
    case 'commerce':
      return 'Pull existing commerce page templates and product catalog data from memory and KG. Council reviews before any UI coding.';
    default:
      return 'Run full context pack retrieval (memory, KG, HLO, research) and escalate to persona council for domain disambiguation.';
  }
}

export function interpretRoughExecutiveGoal(input: string): RoughExecutiveGoalInterpretation {
  const trimmed = input.trim();
  const category = classifyProductCategory(trimmed);

  return {
    rawGoal: trimmed,
    normalizedGoal: trimmed,
    productCategory: category,
    likelyIntent: buildLikelyIntent(trimmed, category),
    contextPackRequired: true,
    firstStage: buildFirstStage(category),
    requiredRetrieval: REQUIRED_RETRIEVAL,
    councilRequired: true,
    approvalRequiredBeforeExecution: true,
    suggestedNextAction: buildSuggestedNextAction(category),
    blockedDirectCodingReason:
      'Direct coding is blocked because no context pack has been assembled and no human approval has been obtained. A context pack (memory + KG + HLO org + research registry) must be retrieved and reviewed by the persona council before any code change. All workspace write-back requires explicit human approval.',
  };
}

export interface RetrievalTask {
  source: 'memory' | 'kg' | 'hlo_org' | 'research_registry';
  task: string;
  priority: 'required';
}

export interface CouncilPersona {
  persona: string;
  concern: string;
}

export interface WorkerRoute {
  lane: string;
  task: string;
  mode: 'audit' | 'controlled_patch';
}

export interface ApprovalGateCheck {
  required: true;
  reason: string;
}

export interface QualityGateCheck {
  gate: string;
  description: string;
}

export interface ExecutiveContextPackPlan {
  interpretation: RoughExecutiveGoalInterpretation;
  retrievalTasks: RetrievalTask[];
  council: CouncilPersona[];
  workerRoutes: WorkerRoute[];
  approvalGate: ApprovalGateCheck;
  qualityGates: QualityGateCheck[];
  directCodingAllowed: false;
  nextUserPrompt: string;
}

export interface RuntimeWorkPackage {
  id: string;
  title: string;
  ownerLane: string;
  exitGate: string;
}

export interface RuntimeTaskSpec {
  project: string;
  task: string;
  phase: 'BUILD';
  mode: 'audit' | 'controlled_patch';
  provider: 'ssu' | 'deepseek-v4-pro' | 'kimi';
  max_wallclock_sec: number;
  max_cost_usd: number;
  budget_policy: 'warn' | 'block';
  allowed_write_globs?: string[];
  expected_artifacts?: Array<{
    path_or_glob: string;
    required: boolean;
    description: string;
  }>;
}

export interface RuntimeAgentRequest {
  taskId: string;
  cycleId: string;
  task: string;
  provider: string;
  model: string;
  mode: RuntimeTaskSpec['mode'];
}

export interface RuntimePmoBoundary {
  noCrossInstanceJoin: true;
  hrdAggregateOnly: true;
  humanWritebackApproval: true;
  directDiscordMutationBlocked: true;
}

export interface RuntimeKgWritebackPlan {
  timing: 'after_quality_gates';
  nodes: string[];
  edges: string[];
  blockedUntilOutcome: true;
}

export interface ApprovedExecutiveRuntimeActivation {
  contextPlan: ExecutiveContextPackPlan;
  approved: boolean;
  directRuntimeDispatchAllowed: boolean;
  blockedReason: string | null;
  wbs: RuntimeWorkPackage[];
  taskSpecs: RuntimeTaskSpec[];
  agentRequests: RuntimeAgentRequest[];
  pmoBoundary: RuntimePmoBoundary;
  kgWritebackPlan: RuntimeKgWritebackPlan;
  qualityGates: QualityGateCheck[];
}

export function buildExecutiveContextPackPlan(input: string): ExecutiveContextPackPlan {
  const interpretation = interpretRoughExecutiveGoal(input);

  const retrievalTasks: RetrievalTask[] = [
    {
      source: 'memory',
      task: 'Retrieve past decisions, signals, and execution traces relevant to the interpreted goal from the memory store.',
      priority: 'required',
    },
    {
      source: 'kg',
      task: 'Query the executive OS knowledge graph for related nodes (signal, issue, decision, work package, lesson) and their edges.',
      priority: 'required',
    },
    {
      source: 'hlo_org',
      task: 'Pull HallaOn organization artifacts: team structures, domain assignments, and existing Workspace tables.',
      priority: 'required',
    },
    {
      source: 'research_registry',
      task: 'Identify external APIs, documentation, or prior research relevant to the goal domain.',
      priority: 'required',
    },
  ];

  const council: CouncilPersona[] = [
    {
      persona: 'product',
      concern: 'Does this goal align with the product roadmap and resident value? What is the MVP scope?',
    },
    {
      persona: 'engineering',
      concern: 'What are the technical constraints, dependencies, and feasibility risks?',
    },
    {
      persona: 'security/privacy',
      concern: 'Are there P4/P5 privacy implications, resident data exposure, or compliance risks?',
    },
    {
      persona: 'PMO/HRD',
      concern: 'What governance mode, personnel impact, and resource allocation does this require?',
    },
  ];

  const workerRoutes: WorkerRoute[] = [
    {
      lane: 'Codex orchestrator',
      task: 'Decompose the approved plan into work packages, assign lanes, and track dependencies.',
      mode: 'audit',
    },
    {
      lane: 'SSU reducer',
      task: 'Compress context and historical briefs into context-safe summaries for downstream workers.',
      mode: 'audit',
    },
    {
      lane: 'DeepSeek audit/research',
      task: 'Audit the plan for architecture, policy, privacy, and approval trail coverage.',
      mode: 'audit',
    },
    {
      lane: 'Kimi implementation',
      task: 'Implement the approved changes within bounded file scope and controlled patch mode.',
      mode: 'controlled_patch',
    },
    {
      lane: 'cheap lanes validation',
      task: 'Run fast smoke tests, lint, and build checks before and after implementation patches.',
      mode: 'audit',
    },
  ];

  const approvalGate: ApprovalGateCheck = {
    required: true,
    reason: 'Human approval is required before any code execution. The context pack plan must be reviewed and explicitly approved before worker lanes begin implementation.',
  };

  const qualityGates: QualityGateCheck[] = [
    {
      gate: 'browser/tool verification',
      description: 'Verify external URLs, facts, and tool outputs before ingesting into context.',
    },
    {
      gate: 'tests/eval',
      description: 'Run existing test suites and eval harnesses to establish baseline and catch regressions.',
    },
    {
      gate: 'privacy/security',
      description: 'Check for P4/P5 data exposure, individual resident profiling, and compliance violations.',
    },
    {
      gate: 'slop/design review',
      description: 'Review outputs for AI slop patterns, design consistency, and adherence to HallaOn UX standards.',
    },
  ];

  const nextUserPrompt = `Context pack plan is ready for review.

Goal: ${interpretation.rawGoal}
Category: ${interpretation.productCategory}
Likely intent: ${interpretation.likelyIntent}

The plan requires:
- 4 retrieval tasks (memory, KG, HLO org, research registry)
- 4 council personas (product, engineering, security/privacy, PMO/HRD)
- 5 worker lanes (Codex, SSU, DeepSeek, Kimi, cheap lanes)
- 4 quality gates (browser verification, tests/eval, privacy/security, slop/design review)

Direct coding is NOT allowed. Human approval is required before execution.

Reply with "approved" to proceed, or provide revisions to the plan.`;

  return {
    interpretation,
    retrievalTasks,
    council,
    workerRoutes,
    approvalGate,
    qualityGates,
    directCodingAllowed: false,
    nextUserPrompt,
  };
}

export interface ExecutiveCouncilBrief {
  lanes: string[];
  decisionQuestions: string[];
  risks: string[];
  approvalRequired: true;
  directCodingAllowed: false;
}

export function buildExecutiveCouncilBrief(plan: ExecutiveContextPackPlan): ExecutiveCouncilBrief {
  return {
    lanes: ['strategy', 'architecture', 'operations'],
    decisionQuestions: [
      `Does the goal "${plan.interpretation.rawGoal}" align with product roadmap and resident value?`,
      'What are the technical constraints, dependencies, and feasibility risks?',
      'Are there privacy, security, or compliance risks requiring human review?',
      'What governance mode, personnel impact, and resource allocation are required?',
    ],
    risks: [
      'Unvalidated scope expansion beyond MVP boundary.',
      'Architecture gaps leading to integration failures or tech debt.',
      'Privacy or HRD boundary violation if aggregate-only rules are bypassed.',
      'Execution without council approval skips governance and quality gates.',
    ],
    approvalRequired: true,
    directCodingAllowed: false,
  };
}

export function buildApprovedExecutiveRuntimeActivation(
  input: string,
  approved: boolean,
): ApprovedExecutiveRuntimeActivation {
  const contextPlan = buildExecutiveContextPackPlan(input);
  const pmoBoundary: RuntimePmoBoundary = {
    noCrossInstanceJoin: true,
    hrdAggregateOnly: true,
    humanWritebackApproval: true,
    directDiscordMutationBlocked: true,
  };
  const kgWritebackPlan: RuntimeKgWritebackPlan = {
    timing: 'after_quality_gates',
    nodes: ['Goal', 'ContextPack', 'WorkPackage', 'TaskSpec', 'Outcome', 'Lesson'],
    edges: [
      'Goal -> ContextPack',
      'ContextPack -> WorkPackage',
      'WorkPackage -> TaskSpec',
      'TaskSpec -> Outcome',
      'Outcome -> Lesson',
    ],
    blockedUntilOutcome: true,
  };

  if (!approved) {
    return {
      contextPlan,
      approved: false,
      directRuntimeDispatchAllowed: false,
      blockedReason: 'Runtime dispatch is blocked until human approval is recorded for the context pack plan.',
      wbs: [],
      taskSpecs: [],
      agentRequests: [],
      pmoBoundary,
      kgWritebackPlan,
      qualityGates: contextPlan.qualityGates,
    };
  }

  const wbs: RuntimeWorkPackage[] = [
    {
      id: 'WP-1-CONTEXT-REDUCE',
      title: 'Reduce memory, KG, HLO, and research evidence into a bounded context pack.',
      ownerLane: 'SSU reducer',
      exitGate: 'retrieval summary accepted',
    },
    {
      id: 'WP-2-ARCH-AUDIT',
      title: 'Audit architecture, privacy, HRD boundary, and PMO assumptions.',
      ownerLane: 'DeepSeek audit/research',
      exitGate: 'policy and architecture findings resolved',
    },
    {
      id: 'WP-3-IMPLEMENT',
      title: 'Apply bounded implementation patches under allowed write globs.',
      ownerLane: 'Kimi implementation',
      exitGate: 'smoke, lint, and build pass',
    },
    {
      id: 'WP-4-VALIDATE-LEARN',
      title: 'Run cheap-lane validation and prepare post-quality-gate KG writeback.',
      ownerLane: 'cheap lanes validation',
      exitGate: 'quality gates green and lesson writeback queued',
    },
  ];

  const taskSpecs: RuntimeTaskSpec[] = [
    {
      project: 'hallaon-workspace',
      task: `${contextPlan.interpretation.normalizedGoal}: reduce retrieval evidence into a bounded context pack.`,
      phase: 'BUILD',
      mode: 'audit',
      provider: 'ssu',
      max_wallclock_sec: 90,
      max_cost_usd: 0.04,
      budget_policy: 'warn',
      expected_artifacts: [
        {
          path_or_glob: 'output/reports/AI-EXECUTIVE-OS-COMPILER0/context-pack-template.json',
          required: true,
          description: 'Context pack source contract',
        },
      ],
    },
    {
      project: 'hallaon-workspace',
      task: `${contextPlan.interpretation.normalizedGoal}: audit architecture, security, privacy, HRD, and PMO boundary.`,
      phase: 'BUILD',
      mode: 'audit',
      provider: 'deepseek-v4-pro',
      max_wallclock_sec: 120,
      max_cost_usd: 0.05,
      budget_policy: 'warn',
    },
    {
      project: 'hallaon-workspace',
      task: `${contextPlan.interpretation.normalizedGoal}: implement the approved bounded product slice.`,
      phase: 'BUILD',
      mode: 'controlled_patch',
      provider: 'kimi',
      max_wallclock_sec: 120,
      max_cost_usd: 0.05,
      budget_policy: 'warn',
      allowed_write_globs: [
        'hallaon-website/src/lib/execOs.ts',
        'hallaon-website/src/components/ExecutiveOSView.tsx',
        'hallaon-website/scripts/exec-os-smoke.ts',
        'output/reports/AI-EXECUTIVE-OS-COMPILER0/*.json',
      ],
    },
    {
      project: 'hallaon-workspace',
      task: `${contextPlan.interpretation.normalizedGoal}: run cheap-lane validation, summarize gate failures, and block writeback if needed.`,
      phase: 'BUILD',
      mode: 'audit',
      provider: 'ssu',
      max_wallclock_sec: 60,
      max_cost_usd: 0.02,
      budget_policy: 'block',
    },
  ];

  const agentRequests: RuntimeAgentRequest[] = taskSpecs.map((spec, index) => ({
    taskId: `AIEXEC-RUNTIME-${String(index + 1).padStart(3, '0')}`,
    cycleId: 'AI-EXECUTIVE-OS-COMPILER0',
    task: spec.task,
    provider: spec.provider,
    model:
      spec.provider === 'kimi'
        ? 'kimi-k2.6'
        : spec.provider === 'deepseek-v4-pro'
          ? 'deepseek-v4-pro'
          : index === 3
            ? 'cheap-lane-validation-via-ssu'
            : 'ssu-gateway',
    mode: spec.mode,
  }));

  return {
    contextPlan,
    approved: true,
    directRuntimeDispatchAllowed: true,
    blockedReason: null,
    wbs,
    taskSpecs,
    agentRequests,
    pmoBoundary,
    kgWritebackPlan,
    qualityGates: contextPlan.qualityGates,
  };
}

export interface ExecutiveLearningMemoryItem {
  category: 'outcome' | 'lesson' | 'model-strength' | 'user-intent';
  content: string;
  scope: 'aggregate' | 'bounded';
  hrdSafe: boolean;
}

export interface ExecutiveLearningKgUpdate {
  nodeType: 'Lesson' | 'Outcome';
  relation: string;
  target: string;
}

export interface ExecutiveLearningRuntimePolicyUpdate {
  policy: string;
  rationale: string;
}

export interface ExecutiveLearningWritebackPlan {
  memoryItems: ExecutiveLearningMemoryItem[];
  kgUpdates: ExecutiveLearningKgUpdate[];
  researchRegistryNotes: string[];
  runtimePolicyUpdates: ExecutiveLearningRuntimePolicyUpdate[];
  blockedUntilQualityGates: true;
  humanApprovalRequired: true;
}

export function buildExecutiveLearningWritebackPlan(
  activation: ApprovedExecutiveRuntimeActivation,
): ExecutiveLearningWritebackPlan {
  const goal = activation.contextPlan.interpretation.rawGoal;
  const category = activation.contextPlan.interpretation.productCategory;

  const memoryItems: ExecutiveLearningMemoryItem[] = [
    {
      category: 'outcome',
      content: `Runtime activation for goal "${goal}" produced ${activation.wbs.length} work packages and ${activation.taskSpecs.length} task specs.`,
      scope: 'aggregate',
      hrdSafe: true,
    },
    {
      category: 'lesson',
      content: 'Learning writeback must remain blocked until all quality gates pass and human approval is recorded.',
      scope: 'bounded',
      hrdSafe: true,
    },
    {
      category: 'model-strength',
      content: 'Deterministic learning plan generation from approved runtime activation preserves HRD aggregate boundary and privacy gates.',
      scope: 'bounded',
      hrdSafe: true,
    },
    {
      category: 'user-intent',
      content: `User intent categorized as ${category}: ${activation.contextPlan.interpretation.likelyIntent}`,
      scope: 'aggregate',
      hrdSafe: true,
    },
  ];

  const kgUpdates: ExecutiveLearningKgUpdate[] = [
    {
      nodeType: 'Lesson',
      relation: 'learned_from',
      target: 'WorkPackage',
    },
    {
      nodeType: 'Outcome',
      relation: 'produced_by',
      target: 'TaskSpec',
    },
  ];

  const researchRegistryNotes: string[] = [
    'Learning writeback MVP slice records deterministic outcome categories without external API calls.',
    'Research registry note: user-intent and model-strength categories are derived from runtime activation, not inferred from raw resident data.',
  ];

  const runtimePolicyUpdates: ExecutiveLearningRuntimePolicyUpdate[] = [
    {
      policy: 'learning_writeback_blocked_until_quality_gates',
      rationale: 'All learning writeback plans must pass privacy/security and slop/design review gates before memory or KG mutation.',
    },
    {
      policy: 'hrd_aggregate_only_in_learning',
      rationale: 'HRD domain signals remain aggregate-only; learning items must not contain individual resident identifiers or raw personnel data.',
    },
  ];

  return {
    memoryItems,
    kgUpdates,
    researchRegistryNotes,
    runtimePolicyUpdates,
    blockedUntilQualityGates: true,
    humanApprovalRequired: true,
  };
}
