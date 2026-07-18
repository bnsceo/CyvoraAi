import type { MachineState } from './governance';
export type { MachineState } from './governance';

export const MACHINE_STATES: MachineState[] = ['IDLE', 'THINKING', 'EXECUTING', 'AWAITING_APPROVAL', 'BLOCKED', 'COMPLETE'];
export type MappedState = { state: MachineState; mapped: boolean; rawStatus: string };

export function mapStatusToMachineState(rawStatus: string | null | undefined, context: { pendingApprovalCount?: number; machineState?: string | null } = {}): MappedState {
  const canonical = (context.machineState || '').toUpperCase();
  if (MACHINE_STATES.includes(canonical as MachineState)) return { state: canonical as MachineState, mapped: true, rawStatus: canonical };
  const raw = (rawStatus || '').trim();
  if (context.pendingApprovalCount) return { state: 'AWAITING_APPROVAL', mapped: true, rawStatus: raw };
  const mappings: Array<[RegExp, MachineState]> = [
    [/^(active|healthy|running|executing)$/i, 'EXECUTING'], [/^(complete|completed|done|resolved|archived)$/i, 'COMPLETE'],
    [/^(building|validating|researching|draft|queued|thinking|revision)$/i, 'THINKING'], [/^(blocked|failed|critical|open|degraded|expired|offline|held|rejected)$/i, 'BLOCKED'],
    [/^(awaiting_approval|pending|waiting)$/i, 'AWAITING_APPROVAL'],
  ];
  for (const [pattern, state] of mappings) if (pattern.test(raw)) return { state, mapped: true, rawStatus: raw };
  return { state: 'IDLE', mapped: false, rawStatus: raw || '(no status recorded)' };
}

export function machineStateTone(state: MachineState): string {
  return state === 'EXECUTING' ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100' : state === 'COMPLETE' ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200' : state === 'THINKING' ? 'border-violet-300/25 bg-violet-300/10 text-violet-100' : state === 'AWAITING_APPROVAL' ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : state === 'BLOCKED' ? 'border-rose-300/25 bg-rose-300/10 text-rose-100' : 'border-slate-400/20 bg-slate-400/10 text-slate-300';
}
