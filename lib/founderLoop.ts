import { buildExecutiveBlueprint } from '@/lib/executiveBlueprint';
import { buildMarketIntelligence } from '@/lib/marketIntelligence';

export type FounderLoopStage =
  | 'objective'
  | 'research'
  | 'blueprint'
  | 'approval'
  | 'policy_gate'
  | 'worker'
  | 'execution'
  | 'validation'
  | 'history';

export type FounderLoopEvent = {
  stage: FounderLoopStage;
  status: 'completed' | 'pending' | 'blocked';
  summary: string;
  traceId: string;
  at: string;
};

export type MockFounderLoop = {
  traceId: string;
  mode: 'mock';
  objective: string;
  research: ReturnType<typeof buildMarketIntelligence>;
  blueprint: ReturnType<typeof buildExecutiveBlueprint>;
  approval: {
    status: 'approved';
    actor: 'founder';
    reason: string;
  };
  policy: {
    decision: 'allow';
    mode: 'mock';
    externalActions: false;
    reason: string;
  };
  execution: {
    worker: 'mock-worker-01';
    task: string;
    status: 'completed';
    output: Record<string, unknown>;
  };
  validation: {
    status: 'accepted';
    protocol: 'deterministic-schema';
    confidence: number;
    findings: string[];
  };
  events: FounderLoopEvent[];
};

const now = () => new Date().toISOString();

export function runMockFounderLoop(rawObjective: string): MockFounderLoop {
  const objective = rawObjective.trim();
  if (!objective) throw new Error('Objective is required.');

  const traceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const research = buildMarketIntelligence(objective);
  const blueprint = buildExecutiveBlueprint(objective);
  const firstTask = blueprint.tasks[0]?.title ?? 'Produce the first founder-ready operating brief';

  const events: FounderLoopEvent[] = [
    { stage: 'objective', status: 'completed', summary: 'Founder objective accepted.', traceId, at: now() },
    { stage: 'research', status: 'completed', summary: 'Market signals, reference operators, durable patterns, and gaps extracted.', traceId, at: now() },
    { stage: 'blueprint', status: 'completed', summary: 'Company structure and first task chain generated from the researched objective.', traceId, at: now() },
    { stage: 'approval', status: 'completed', summary: 'Founder approved the mocked blueprint and first task.', traceId, at: now() },
    { stage: 'policy_gate', status: 'completed', summary: 'Mock policy allowed execution with all external actions disabled.', traceId, at: now() },
    { stage: 'worker', status: 'completed', summary: 'Mock worker claimed the approved task once.', traceId, at: now() },
    { stage: 'execution', status: 'completed', summary: 'Mock provider produced a structured result.', traceId, at: now() },
    { stage: 'validation', status: 'completed', summary: 'Deterministic schema validation accepted the output.', traceId, at: now() },
    { stage: 'history', status: 'completed', summary: 'The complete trace was recorded for founder inspection.', traceId, at: now() },
  ];

  return {
    traceId,
    mode: 'mock',
    objective,
    research,
    blueprint,
    approval: {
      status: 'approved',
      actor: 'founder',
      reason: 'Acceptance test approval for a simulated, side-effect-free execution.',
    },
    policy: {
      decision: 'allow',
      mode: 'mock',
      externalActions: false,
      reason: 'The workflow is deterministic, cost-free, and cannot call external connectors.',
    },
    execution: {
      worker: 'mock-worker-01',
      task: firstTask,
      status: 'completed',
      output: {
        summary: 'First operating task completed in mock mode.',
        deliverable: `Founder-ready result for: ${firstTask}`,
        status: 'completed',
        confidence: 0.91,
        next_action: 'Founder reviews the validated output and decides whether to continue.',
      },
    },
    validation: {
      status: 'accepted',
      protocol: 'deterministic-schema',
      confidence: 0.95,
      findings: [],
    },
    events,
  };
}
