// Adapter layer only. The database stores free-form `status` strings
// (companies.status defaults to 'active'; approvals/connectors use their own
// vocabularies). This file maps those legacy values onto the strict Cyvora
// agent state machine defined in SYSTEM_ARCHITECTURE without altering any
// stored data or requiring a schema migration.

export type MachineState =
  | 'IDLE'
  | 'THINKING'
  | 'EXECUTING'
  | 'AWAITING_APPROVAL'
  | 'BLOCKED'
  | 'COMPLETE';

export const MACHINE_STATES: MachineState[] = [
  'IDLE',
  'THINKING',
  'EXECUTING',
  'AWAITING_APPROVAL',
  'BLOCKED',
  'COMPLETE',
];

export type MappedState = {
  state: MachineState;
  /** false when the raw status did not match a known rule and fell back to IDLE */
  mapped: boolean;
  /** the original, unmodified value from the database, kept for audit purposes */
  rawStatus: string;
};

const EXECUTING_PATTERNS = /^(active|healthy|running|executing)$/i;
const COMPLETE_PATTERNS = /^(complete|completed|done|resolved|archived)$/i;
const THINKING_PATTERNS = /^(building|validating|researching|draft|queued|thinking)$/i;
const BLOCKED_PATTERNS = /^(blocked|failed|critical|open|degraded|expired|offline)$/i;
const AWAITING_PATTERNS = /^(awaiting_approval|pending|waiting|revision)$/i;
const ATTENTION_PATTERNS = /^(attention)$/i;

/**
 * Maps a legacy/free-form status string to a strict machine state.
 * `pendingApprovalCount` disambiguates the ambiguous `attention` / `revision`
 * values per the founder's rule: default to AWAITING_APPROVAL when pending
 * work exists, otherwise BLOCKED.
 */
export function mapStatusToMachineState(
  rawStatus: string | null | undefined,
  context: { pendingApprovalCount?: number } = {}
): MappedState {
  const raw = (rawStatus || '').trim();
  const pendingApprovalCount = context.pendingApprovalCount ?? 0;

  if (EXECUTING_PATTERNS.test(raw)) return { state: 'EXECUTING', mapped: true, rawStatus: raw };
  if (COMPLETE_PATTERNS.test(raw)) return { state: 'COMPLETE', mapped: true, rawStatus: raw };
  if (THINKING_PATTERNS.test(raw)) return { state: 'THINKING', mapped: true, rawStatus: raw };
  if (AWAITING_PATTERNS.test(raw)) return { state: 'AWAITING_APPROVAL', mapped: true, rawStatus: raw };
  if (BLOCKED_PATTERNS.test(raw)) return { state: 'BLOCKED', mapped: true, rawStatus: raw };
  if (ATTENTION_PATTERNS.test(raw)) {
    return {
      state: pendingApprovalCount > 0 ? 'AWAITING_APPROVAL' : 'BLOCKED',
      mapped: true,
      rawStatus: raw,
    };
  }

  return { state: 'IDLE', mapped: false, rawStatus: raw || '(no status recorded)' };
}

export function machineStateTone(state: MachineState): string {
  switch (state) {
    case 'EXECUTING':
      return 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100';
    case 'COMPLETE':
      return 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200';
    case 'THINKING':
      return 'border-violet-300/25 bg-violet-300/10 text-violet-100';
    case 'AWAITING_APPROVAL':
      return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
    case 'BLOCKED':
      return 'border-rose-300/25 bg-rose-300/10 text-rose-100';
    case 'IDLE':
    default:
      return 'border-slate-400/20 bg-slate-400/10 text-slate-300';
  }
}
