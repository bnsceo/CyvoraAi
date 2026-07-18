import crypto from 'crypto';

export type MachineState = 'IDLE' | 'THINKING' | 'EXECUTING' | 'AWAITING_APPROVAL' | 'BLOCKED' | 'COMPLETE';
export type ApprovalDecision = 'approve' | 'approve_with_conditions' | 'request_revision' | 'hold' | 'reject';

const allowedTransitions: Record<MachineState, MachineState[]> = {
  IDLE: ['THINKING', 'AWAITING_APPROVAL', 'BLOCKED'],
  THINKING: ['AWAITING_APPROVAL', 'EXECUTING', 'BLOCKED'],
  AWAITING_APPROVAL: ['EXECUTING', 'THINKING', 'BLOCKED'],
  EXECUTING: ['AWAITING_APPROVAL', 'BLOCKED', 'COMPLETE'],
  BLOCKED: ['THINKING', 'AWAITING_APPROVAL', 'EXECUTING'],
  COMPLETE: ['THINKING', 'AWAITING_APPROVAL'],
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function contentHash(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function assertTransition(previous: MachineState, next: MachineState): void {
  if (previous === next) return;
  if (!allowedTransitions[previous].includes(next)) throw new Error(`Invalid machine-state transition: ${previous} -> ${next}`);
}

export function decisionToState(decision: ApprovalDecision): MachineState {
  if (decision === 'approve' || decision === 'approve_with_conditions') return 'EXECUTING';
  if (decision === 'request_revision') return 'THINKING';
  return 'BLOCKED';
}
