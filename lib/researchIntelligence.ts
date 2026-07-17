import { createHash } from 'crypto';

export type ResearchSource = {
  id: string;
  type: 'trend' | 'operator' | 'customer' | 'pricing' | 'workflow';
  title: string;
  observation: string;
  provenance: 'mock-seed';
  freshness: 'current-demo';
};

export type ResearchPattern = {
  name: string;
  evidence: string[];
  implication: string;
};

export type ResearchPackage = {
  id: string;
  objective: string;
  mode: 'mock';
  status: 'completed';
  sources: ResearchSource[];
  patterns: ResearchPattern[];
  marketGaps: string[];
  blueprintDirectives: string[];
  confidence: number;
  generatedAt: string;
};

const stableId = (objective: string): string =>
  createHash('sha256').update(objective.trim().toLowerCase()).digest('hex').slice(0, 16);

const objectiveLabel = (objective: string): string => {
  const words = objective.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 8).join(' ') || 'founder objective';
};

/**
 * Deterministic zero-cost research package used by local/demo mode.
 *
 * This is intentionally explicit about being seeded evidence. It proves the
 * operating contract—objective -> research -> blueprint—without pretending
 * that live market research occurred. A production provider can replace this
 * implementation while preserving the same typed output and provenance rules.
 */
export function buildMockResearchPackage(objective: string): ResearchPackage {
  const normalized = objective.trim();
  if (!normalized) throw new Error('Objective is required for research.');

  const label = objectiveLabel(normalized);
  const id = `research-${stableId(normalized)}`;
  const sources: ResearchSource[] = [
    {
      id: `${id}-trend`,
      type: 'trend',
      title: 'Demand and trend signal',
      observation: `Validate where demand related to “${label}” is increasing, stable, or saturated before committing resources.`,
      provenance: 'mock-seed',
      freshness: 'current-demo',
    },
    {
      id: `${id}-operator`,
      type: 'operator',
      title: 'Leading operator pattern',
      observation: 'Study how credible operators acquire customers, package value, deliver outcomes, and retain trust.',
      provenance: 'mock-seed',
      freshness: 'current-demo',
    },
    {
      id: `${id}-customer`,
      type: 'customer',
      title: 'Customer language pattern',
      observation: 'Map the urgent jobs, objections, proof requirements, and switching costs expressed by target customers.',
      provenance: 'mock-seed',
      freshness: 'current-demo',
    },
    {
      id: `${id}-pricing`,
      type: 'pricing',
      title: 'Pricing and unit-economics pattern',
      observation: 'Compare pricing architecture, delivery cost, gross-margin pressure, and approval-worthy spending assumptions.',
      provenance: 'mock-seed',
      freshness: 'current-demo',
    },
    {
      id: `${id}-workflow`,
      type: 'workflow',
      title: 'Operating workflow pattern',
      observation: 'Separate repeatable operating mechanisms from protected branding, content, code, and other intellectual property.',
      provenance: 'mock-seed',
      freshness: 'current-demo',
    },
  ];

  return {
    id,
    objective: normalized,
    mode: 'mock',
    status: 'completed',
    sources,
    patterns: [
      {
        name: 'Evidence before structure',
        evidence: [sources[0].id, sources[2].id],
        implication: 'The blueprint must state the market assumption and the evidence required to keep it valid.',
      },
      {
        name: 'Reverse-engineer mechanisms, not identity',
        evidence: [sources[1].id, sources[4].id],
        implication: 'Adapt durable workflows into an original company model; do not reproduce proprietary assets or presentation.',
      },
      {
        name: 'Govern economics from the start',
        evidence: [sources[3].id],
        implication: 'Every initial workflow needs a cost ceiling, success measure, and founder-visible exception path.',
      },
    ],
    marketGaps: [
      'Unmet customer urgency that established operators serve poorly or inconsistently.',
      'Trust gaps where buyers need clearer evidence, accountability, or human approval.',
      'Operational gaps where a smaller AI-native company can deliver faster without sacrificing governance.',
    ],
    blueprintDirectives: [
      'Create a dedicated market-intelligence function before production functions.',
      'Attach evidence and assumptions to the first company thesis.',
      'Require founder approval before external execution or material spend.',
      'Preserve research provenance and decisions in operating history.',
    ],
    confidence: 0.72,
    generatedAt: new Date().toISOString(),
  };
}
