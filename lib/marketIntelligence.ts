export type MarketSignal = {
  name: string;
  evidence: string;
  relevance: number;
  confidence: number;
};

export type ReferenceOperator = {
  name: string;
  category: string;
  strengths: string[];
  weaknesses: string[];
  durablePatterns: string[];
};

export type MarketIntelligence = {
  id: string;
  objective: string;
  generatedAt: string;
  mode: 'mock';
  signals: MarketSignal[];
  referenceOperators: ReferenceOperator[];
  opportunityGaps: string[];
  extractedPatterns: string[];
  differentiationRules: string[];
  recommendedWedge: string;
  researchSummary: string;
};

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

const objectiveKind = (objective: string) => {
  const text = objective.toLowerCase();
  if (/content|media|youtube|newsletter|audience/.test(text)) return 'media';
  if (/software|saas|app|platform|developer/.test(text)) return 'software';
  if (/research|investment|market|finance/.test(text)) return 'research';
  if (/service|agency|consult/.test(text)) return 'services';
  return 'company';
};

export function buildMarketIntelligence(rawObjective: string): MarketIntelligence {
  const objective = normalize(rawObjective);
  if (!objective) throw new Error('Objective is required.');
  const kind = objectiveKind(objective);
  const generatedAt = new Date().toISOString();

  const signals: MarketSignal[] = [
    {
      name: 'Demand concentration',
      evidence: `Mock research indicates buyers reward ${kind} offers that solve one measurable operating problem before expanding breadth.`,
      relevance: 0.94,
      confidence: 0.82,
    },
    {
      name: 'Trust as product infrastructure',
      evidence: 'Approval controls, visible provenance, cost boundaries, and recoverable execution materially improve adoption for agentic workflows.',
      relevance: 0.97,
      confidence: 0.88,
    },
    {
      name: 'Outcome-led onboarding',
      evidence: 'The strongest products move users from one objective to one completed result instead of presenting an empty dashboard.',
      relevance: 0.96,
      confidence: 0.86,
    },
  ];

  const referenceOperators: ReferenceOperator[] = [
    {
      name: 'Category leader pattern',
      category: 'Agentic operations',
      strengths: ['Clear operating model', 'Reusable execution primitives', 'Governance language'],
      weaknesses: ['Broad enterprise scope', 'Complex initial configuration', 'Weak founder-specific wedge'],
      durablePatterns: ['Connect context', 'Orchestrate work', 'Execute through controlled tools', 'Govern every consequential action'],
    },
    {
      name: 'Founder platform pattern',
      category: 'Company-building software',
      strengths: ['Fast time to first plan', 'Founder-centered workflow', 'Strong templates'],
      weaknesses: ['Plans often stop before execution', 'Limited runtime evidence', 'Weak recovery posture'],
      durablePatterns: ['Start with intent', 'Create structure', 'Make the next decision obvious'],
    },
  ];

  const opportunityGaps = [
    'Turn market evidence into an original company blueprint instead of generating from a blank prompt.',
    'Keep the founder as final authority while allowing workers to execute approved tasks.',
    'Make policy, validation, recovery, and history visible as operating surfaces rather than hidden middleware.',
    'Prove one complete workflow before expanding the platform surface area.',
  ];

  const extractedPatterns = [
    'Narrow objective before organization design.',
    'Separate evidence collection from blueprint judgment.',
    'Require explicit approval for consequential actions.',
    'Persist every transition under one trace identifier.',
    'Validate outputs before they become accepted company knowledge.',
  ];

  const differentiationRules = [
    'Do not copy competitor language, visual identity, proprietary content, or implementation details.',
    'Extract general operating principles and adapt them to the founder objective.',
    'Record assumptions and confidence so the blueprint remains challengeable.',
    'Prefer an underserved founder workflow over feature parity with broad enterprise platforms.',
  ];

  const recommendedWedge = `Build a founder-controlled ${kind} operating company that moves from researched opportunity to one approved, validated workflow.`;

  return {
    id: `research_${Date.now()}`,
    objective,
    generatedAt,
    mode: 'mock',
    signals,
    referenceOperators,
    opportunityGaps,
    extractedPatterns,
    differentiationRules,
    recommendedWedge,
    researchSummary: `Research supports a narrow founder wedge for “${objective}”: use evidence to shape the company, preserve founder approval, and prove one end-to-end operating workflow before broadening.`,
  };
}
