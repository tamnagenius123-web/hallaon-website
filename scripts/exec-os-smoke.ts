import { strict as assert } from 'node:assert';
import {
  buildExecutiveBrief,
  buildApprovedExecutiveRuntimeActivation,
  buildExecutiveContextPackPlan,
  buildExecutiveCouncilBrief,
  buildExecutiveLearningWritebackPlan,
  createOutcome,
  createIssueFromSignal,
  createWorkspaceDraft,
  evaluateSignalBoundary,
  getDelegationDogfoodPackets,
  getExecutiveOsContextPackTemplate,
  getExecutiveOsKgRoadmap,
  getPmbokOperatingModel,
  getWorkspaceWritePlan,
  interpretRoughExecutiveGoal,
  recommendPmbokGovernanceMode,
  scoreAgendaRiskHeuristic,
  type ExecApproval,
  type ExecSignal,
} from '../src/lib/execOs';

const hrdSignal: ExecSignal = {
  id: 'sig-hrd-1',
  sourceType: 'bot',
  sourcePath: 'hallaon-bot/bot/event_emit.py',
  domain: 'hrd',
  kind: 'ritual_drop',
  summary: 'Weekly HRD checkout completion dropped',
  aggregateOnly: true,
  privacyLevel: 'P3',
  candidate: true,
  createdAt: '2026-05-28T00:00:00Z',
};

const unsafeHrdSignal: ExecSignal = {
  ...hrdSignal,
  id: 'sig-hrd-unsafe',
  aggregateOnly: false,
  payload: { residentId: 'raw-person' },
};

const privacySignal: ExecSignal = {
  id: 'sig-legal-1',
  sourceType: 'deep_report',
  sourcePath: 'external/audit',
  domain: 'ops',
  kind: 'compliance_alert',
  summary: 'Legal privacy GDPR breach detected',
  aggregateOnly: true,
  privacyLevel: 'P4',
  candidate: true,
  createdAt: '2026-05-28T00:00:00Z',
};

assert.equal(evaluateSignalBoundary(hrdSignal).ok, true);
assert.equal(evaluateSignalBoundary(unsafeHrdSignal).ok, false);
assert.match(evaluateSignalBoundary(unsafeHrdSignal).reason || '', /aggregate/);

const issue = createIssueFromSignal(hrdSignal);
assert.equal(issue.domain, 'hrd');
assert.equal(issue.status, 'candidate');
assert.equal(issue.createdFromSignalId, 'sig-hrd-1');
assert.equal(issue.evidence.length, 1);

const brief = buildExecutiveBrief({
  tasks: [
    { id: 't1', title: 'Prepare roadmap', status: 'completed', assignee: 'PM', team: 'PM' } as any,
    { id: 't2', title: 'Close approval gate', status: 'blocked', assignee: 'OPS', team: 'OPS' } as any,
  ],
  agendas: [{ id: 'a1', title: 'Approve OS scope', status: 'pending' } as any],
  decisions: [{ id: 'd1', agenda_id: 'a1', created_at: '2026-05-28T00:00:00Z' } as any],
  signals: [hrdSignal],
});

assert.equal(brief.totalTasks, 2);
assert.equal(brief.blockedTasks, 1);
assert.equal(brief.candidateSignals, 1);
assert.equal(brief.hrdSignals, 1);

const approval: ExecApproval = {
  id: 'ap-1',
  issueId: issue.id,
  approvedBy: 'chair',
  approvalState: 'approved',
  target: 'agenda',
  createdAt: '2026-05-28T00:00:00Z',
};

assert.deepEqual(getWorkspaceWritePlan(approval), {
  canWrite: true,
  table: 'agendas',
  requiresHumanApproval: true,
});

const draft = createWorkspaceDraft(issue, approval, new Date('2026-05-28T00:00:00Z'));
assert.equal(draft.table, 'agendas');
assert.equal(draft.payload.proposer, 'AI Executive OS');
assert.equal(draft.payload.proposed_date, '2026-05-28');
assert.equal(draft.payload.content.executive_os, true);
assert.equal(draft.payload.content.evidence[0].source_path, 'hallaon-bot/bot/event_emit.py');

const outcome = createOutcome(issue, approval, 'drafted');
assert.equal(outcome.issueId, issue.id);
assert.equal(outcome.target, 'agenda');
assert.equal(outcome.status, 'drafted');

const packets = getDelegationDogfoodPackets({
  mcpStaleVerdict: 'OK',
  staleProcesses: 0,
  freshProcesses: 3,
});
assert.equal(packets.length, 3);
assert.deepEqual(packets.map(packet => packet.provider), ['ssu', 'kimi', 'deepseek']);
assert.ok(packets.every(packet => packet.status === 'ready'));
assert.ok(packets.find(packet => packet.provider === 'ssu')?.task.includes('PMBOK'));
assert.ok(packets.find(packet => packet.provider === 'kimi')?.allowedWriteGlobs?.includes('hallaon-website/src/lib/execOs.ts'));
assert.ok(packets.find(packet => packet.provider === 'deepseek')?.task.includes('HRD'));

const blockedPackets = getDelegationDogfoodPackets({
  mcpStaleVerdict: 'NEEDS_USER_DECISION',
  staleProcesses: 6,
  freshProcesses: 0,
});
assert.ok(blockedPackets.every(packet => packet.status === 'blocked_by_stale_runtime_gate'));

const pmbok = getPmbokOperatingModel();
assert.equal(pmbok.artifacts.filter(artifact => artifact.mvp).length, 5);
assert.equal(pmbok.minimumForms.length, 9);
assert.ok(pmbok.artifacts.some(artifact => artifact.id === 'raid_register'));
assert.ok(pmbok.minimumForms.some(form => form.id === 'change_request'));
assert.ok(pmbok.minimumForms.some(form => form.id === 'weekly_executive_brief'));
assert.ok(pmbok.gates.some(gate => gate.id === 'human_approval_gate'));
assert.equal(pmbok.workPackages.length, 7);
assert.equal(pmbok.hrdBoundary.status, 'draft-sensitive');
assert.ok(pmbok.hrdBoundary.forbidden.includes('automated personnel decisions'));
assert.equal(
  recommendPmbokGovernanceMode({
    size: 1,
    complexity: 1,
    risk: 1,
    urgency: 1,
    novelty: 1,
    privacySensitivity: 1,
  }),
  'lightweight',
);
assert.equal(
  recommendPmbokGovernanceMode({
    size: 2,
    complexity: 2,
    risk: 2,
    urgency: 2,
    novelty: 2,
    privacySensitivity: 4,
  }),
  'high-governance',
);

const kg = getExecutiveOsKgRoadmap();
assert.deepEqual(kg.nodes.map(node => node.id), [
  'source',
  'signal',
  'issue',
  'evidence',
  'rule',
  'pmbok_principle',
  'pmbok_artifact',
  'raid_item',
  'scenario',
  'approval',
  'decision',
  'work_package',
  'task',
  'outcome',
  'lesson',
  'hrd_ritual_log',
]);
assert.ok(kg.edges.some(edge => edge.from === 'approval' && edge.to === 'decision'));
assert.ok(kg.shippingSlices[0].includes('executive-os Workspace tab'));
assert.ok(kg.shippingSlices.includes('PMBOK operating model panel'));

assert.equal(
  getWorkspaceWritePlan({ ...approval, approvalState: 'pending' }).canWrite,
  false,
);

const hrdHeuristic = scoreAgendaRiskHeuristic(issue);
assert.equal(hrdHeuristic.tier, 'mandatory-human');
assert.equal(hrdHeuristic.automationCapped, true);

const privacyIssue = createIssueFromSignal(privacySignal);
const privacyHeuristic = scoreAgendaRiskHeuristic(privacyIssue);
assert.equal(privacyHeuristic.requiresHumanAgenda, true);
assert.ok(privacyHeuristic.boundedDisclaimer.includes('Not objective truth'));

// ── interpretRoughExecutiveGoal smoke ──

const goal1Result = interpretRoughExecutiveGoal('AI Executive OS 만들기');
assert.equal(goal1Result.productCategory, 'executive_os');
assert.equal(goal1Result.contextPackRequired, true);
assert.equal(goal1Result.councilRequired, true);
assert.equal(goal1Result.approvalRequiredBeforeExecution, true);
assert.ok(goal1Result.requiredRetrieval.includes('memory'));
assert.ok(goal1Result.requiredRetrieval.includes('kg'));
assert.ok(goal1Result.requiredRetrieval.includes('hlo_org'));
assert.ok(goal1Result.requiredRetrieval.includes('research_registry'));
assert.ok(goal1Result.blockedDirectCodingReason.includes('context pack'));
assert.ok(goal1Result.blockedDirectCodingReason.includes('approval'));
assert.equal(goal1Result.rawGoal, 'AI Executive OS 만들기');
assert.equal(goal1Result.normalizedGoal, 'AI Executive OS 만들기');
assert.ok(goal1Result.likelyIntent.length > 0);
assert.ok(goal1Result.firstStage.length > 0);
assert.ok(goal1Result.suggestedNextAction.length > 0);

const goal2Result = interpretRoughExecutiveGoal('할 일을 관리해주는 시스템을 만들기');
assert.equal(goal2Result.productCategory, 'hallaon_ops');
assert.equal(goal2Result.contextPackRequired, true);
assert.equal(goal2Result.councilRequired, true);
assert.equal(goal2Result.approvalRequiredBeforeExecution, true);
assert.ok(goal2Result.requiredRetrieval.includes('memory'));
assert.ok(goal2Result.requiredRetrieval.includes('kg'));
assert.ok(goal2Result.requiredRetrieval.includes('hlo_org'));
assert.ok(goal2Result.requiredRetrieval.includes('research_registry'));
assert.ok(goal2Result.blockedDirectCodingReason.includes('context pack'));
assert.ok(goal2Result.blockedDirectCodingReason.includes('approval'));
assert.ok(goal2Result.likelyIntent.length > 0);
assert.ok(goal2Result.firstStage.length > 0);
assert.ok(goal2Result.suggestedNextAction.length > 0);

const goal3Result = interpretRoughExecutiveGoal('랜딩페이지를 SaaS로 만들고 싶어');
assert.equal(goal3Result.productCategory, 'saas');
assert.equal(goal3Result.contextPackRequired, true);
assert.equal(goal3Result.councilRequired, true);
assert.equal(goal3Result.approvalRequiredBeforeExecution, true);
assert.ok(goal3Result.requiredRetrieval.includes('memory'));
assert.ok(goal3Result.requiredRetrieval.includes('kg'));
assert.ok(goal3Result.requiredRetrieval.includes('hlo_org'));
assert.ok(goal3Result.requiredRetrieval.includes('research_registry'));
assert.ok(goal3Result.blockedDirectCodingReason.includes('context pack'));
assert.ok(goal3Result.blockedDirectCodingReason.includes('approval'));
assert.ok(goal3Result.likelyIntent.length > 0);
assert.ok(goal3Result.firstStage.length > 0);
assert.ok(goal3Result.suggestedNextAction.length > 0);

const goal4Result = interpretRoughExecutiveGoal('Q-Boost 상품 페이지를 몇 초 만에 만들기');
assert.equal(goal4Result.productCategory, 'commerce');
assert.equal(goal4Result.contextPackRequired, true);
assert.equal(goal4Result.councilRequired, true);
assert.equal(goal4Result.approvalRequiredBeforeExecution, true);
assert.ok(goal4Result.requiredRetrieval.includes('memory'));
assert.ok(goal4Result.requiredRetrieval.includes('kg'));
assert.ok(goal4Result.requiredRetrieval.includes('hlo_org'));
assert.ok(goal4Result.requiredRetrieval.includes('research_registry'));
assert.ok(goal4Result.blockedDirectCodingReason.includes('context pack'));
assert.ok(goal4Result.blockedDirectCodingReason.includes('approval'));
assert.ok(goal4Result.likelyIntent.length > 0);
assert.ok(goal4Result.firstStage.length > 0);
assert.ok(goal4Result.suggestedNextAction.length > 0);

// Edge case: empty/unknown input
const goalUnknownResult = interpretRoughExecutiveGoal('');
assert.equal(goalUnknownResult.productCategory, 'unknown');
assert.equal(goalUnknownResult.contextPackRequired, true);
assert.ok(goalUnknownResult.blockedDirectCodingReason.includes('context pack'));

const goalGarbageResult = interpretRoughExecutiveGoal('xyzzy irrelevant nonsense');
assert.equal(goalGarbageResult.productCategory, 'unknown');
assert.equal(goalGarbageResult.contextPackRequired, true);
assert.ok(goalGarbageResult.blockedDirectCodingReason.includes('human approval'));

const contextPlan = buildExecutiveContextPackPlan('AI Executive OS 만들기');
assert.equal(contextPlan.interpretation.productCategory, 'executive_os');
assert.equal(contextPlan.directCodingAllowed, false);
assert.deepEqual(
  contextPlan.retrievalTasks.map(task => task.source).sort(),
  ['hlo_org', 'kg', 'memory', 'research_registry']
);
assert.ok(contextPlan.council.some(persona => persona.persona === 'security/privacy'));
assert.ok(contextPlan.council.some(persona => persona.persona === 'PMO/HRD'));
assert.ok(contextPlan.workerRoutes.some(route => route.lane.includes('SSU')));
assert.ok(contextPlan.workerRoutes.some(route => route.lane.includes('DeepSeek')));
assert.ok(contextPlan.workerRoutes.some(route => route.lane.includes('Kimi')));
assert.ok(contextPlan.workerRoutes.some(route => route.lane.includes('cheap')));
assert.equal(contextPlan.approvalGate.required, true);
assert.ok(contextPlan.approvalGate.reason.includes('Human approval'));
assert.ok(contextPlan.qualityGates.some(gate => gate.gate === 'browser/tool verification'));
assert.ok(contextPlan.qualityGates.some(gate => gate.gate === 'tests/eval'));
assert.ok(contextPlan.qualityGates.some(gate => gate.gate === 'privacy/security'));
assert.ok(contextPlan.qualityGates.some(gate => gate.gate === 'slop/design review'));
assert.ok(contextPlan.nextUserPrompt.length > 0);
assert.ok(contextPlan.nextUserPrompt.toLowerCase().includes('approval'));

const councilBrief = buildExecutiveCouncilBrief(contextPlan);
assert.ok(councilBrief.lanes.includes('strategy'));
assert.ok(councilBrief.lanes.includes('architecture'));
assert.ok(councilBrief.lanes.includes('operations'));
assert.equal(councilBrief.approvalRequired, true);
assert.equal(councilBrief.directCodingAllowed, false);
assert.ok(councilBrief.decisionQuestions.length > 0);
assert.ok(councilBrief.risks.length > 0);

const blockedActivation = buildApprovedExecutiveRuntimeActivation('AI Executive OS 만들기', false);
assert.equal(blockedActivation.approved, false);
assert.equal(blockedActivation.directRuntimeDispatchAllowed, false);
assert.ok(blockedActivation.blockedReason?.includes('human approval'));
assert.equal(blockedActivation.taskSpecs.length, 0);

const approvedActivation = buildApprovedExecutiveRuntimeActivation('AI Executive OS 만들기', true);
assert.equal(approvedActivation.approved, true);
assert.equal(approvedActivation.directRuntimeDispatchAllowed, true);
assert.equal(approvedActivation.blockedReason, null);
assert.ok(approvedActivation.wbs.length >= 4);
assert.ok(approvedActivation.taskSpecs.length >= 4);
assert.ok(approvedActivation.taskSpecs.some(spec => spec.provider === 'ssu'));
assert.ok(approvedActivation.taskSpecs.some(spec => spec.provider === 'deepseek-v4-pro'));
assert.ok(approvedActivation.taskSpecs.some(spec => spec.provider === 'kimi'));
assert.ok(approvedActivation.agentRequests.some(request => request.model.includes('cheap-lane')));
assert.equal(approvedActivation.pmoBoundary.noCrossInstanceJoin, true);
assert.equal(approvedActivation.pmoBoundary.hrdAggregateOnly, true);
assert.equal(approvedActivation.pmoBoundary.humanWritebackApproval, true);
assert.equal(approvedActivation.kgWritebackPlan.blockedUntilOutcome, true);
assert.ok(approvedActivation.kgWritebackPlan.nodes.includes('Lesson'));
assert.ok(approvedActivation.qualityGates.some(gate => gate.gate === 'privacy/security'));

const learningWriteback = buildExecutiveLearningWritebackPlan(approvedActivation);
assert.ok(learningWriteback.memoryItems.length >= 4);
assert.ok(learningWriteback.memoryItems.every(item => item.hrdSafe));
assert.ok(learningWriteback.kgUpdates.some(update => update.nodeType === 'Lesson'));
assert.ok(learningWriteback.kgUpdates.some(update => update.nodeType === 'Outcome'));
assert.ok(learningWriteback.researchRegistryNotes.length > 0);
assert.ok(learningWriteback.runtimePolicyUpdates.length > 0);
assert.equal(learningWriteback.blockedUntilQualityGates, true);
assert.equal(learningWriteback.humanApprovalRequired, true);
assert.ok(
  learningWriteback.runtimePolicyUpdates.some(
    policy => policy.policy.includes('hrd_aggregate_only') || policy.rationale.includes('hrd_aggregate_only'),
  ),
);

console.log('exec-os-smoke PASS');
