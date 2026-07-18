import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { getApprovalById, updateApprovalStatus, finalizeApprovedResult, getTasks } from '@/lib/db';
import { contentHash, type ApprovalDecision } from '@/lib/governance';
import { ensureApprovalSnapshot, getApprovalSnapshot, signApproval } from '@/lib/governanceStore';
import { sendSSEEvent } from '@/app/api/stream/route';

const decisions: ApprovalDecision[] = ['approve', 'approve_with_conditions', 'request_revision', 'hold', 'reject'];

async function loadHandshake(id: number, tenant: string) {
  const approval = await getApprovalById(id, tenant);
  if (!approval) return null;
  const tasks = await getTasks(approval.company_id);
  const task = tasks.find((item) => item.id === approval.task_id) || null;
  const snapshot = await ensureApprovalSnapshot({
    tenant, companyId: approval.company_id, approvalId: id, taskId: approval.task_id,
    intent: { title: approval.title, summary: approval.summary, riskLevel: approval.risk_level },
    plan: { taskId: approval.task_id, taskTitle: task?.title, taskDescription: task?.description, workflowStage: task?.workflow_stage, assignedAgent: task?.assigned_agent, validationPolicy: task?.validation_policy },
    policy: { riskLevel: approval.risk_level, approvalType: approval.approval_type, requiresFounder: true }, traceId: approval.trace_id,
  });
  return { approval, task, snapshot };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await getTenantId();
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid approval id' }, { status: 400 });
  const handshake = await loadHandshake(id, tenant);
  if (!handshake) return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
  const approverId = 'founder';
  return NextResponse.json({ ...handshake, signature_payload: { approvalId: id, planHash: handshake.snapshot?.plan_hash, approverId }, signature: contentHash({ approvalId: id, planHash: handshake.snapshot?.plan_hash, decision: 'approve', approverId }) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const action = body.action as ApprovalDecision;
    const id = Number.parseInt((await params).id, 10);
    if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid approval id' }, { status: 400 });
    if (!decisions.includes(action)) return NextResponse.json({ error: `Action must be one of: ${decisions.join(', ')}` }, { status: 400 });
    const tenant = await getTenantId();
    const handshake = await loadHandshake(id, tenant);
    if (!handshake) return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    const approverId = String(body.approver_id || 'founder');
    const expectedSignature = contentHash({ approvalId: id, planHash: handshake.snapshot?.plan_hash, decision: action, approverId });
    if (body.signature !== expectedSignature) return NextResponse.json({ error: 'A valid founder signature is required for this exact decision and plan hash', expected_signature: expectedSignature }, { status: 409 });
    const status = action === 'approve' || action === 'approve_with_conditions' ? 'approved' : action === 'request_revision' ? 'revision' : action === 'reject' ? 'rejected' : 'held';
    await signApproval({ tenant, companyId: handshake.approval.company_id, approvalId: id, decision: action, approverId, signature: body.signature, conditions: body.conditions, reason: body.reason, traceId: handshake.approval.trace_id });
    await updateApprovalStatus({ id, company_id: handshake.approval.company_id, status });
    if ((action === 'approve' || action === 'approve_with_conditions') && handshake.approval.approval_type === 'result_acceptance') {
      await finalizeApprovedResult({ approval_id: id, company_id: handshake.approval.company_id, task_id: handshake.approval.task_id, output_id: handshake.approval.subject_id, execution_run_id: handshake.approval.execution_run_id });
    }
    const event = await sendSSEEvent({ type: 'approval.decided', tenant, companyId: handshake.approval.company_id, traceId: handshake.approval.trace_id, payload: { approvalId: id, action, status, approverId, conditions: body.conditions || null, planHash: handshake.snapshot?.plan_hash } });
    return NextResponse.json({ id, company_id: handshake.approval.company_id, status, task_id: handshake.approval.task_id || null, trace_id: handshake.approval.trace_id, event_id: event.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 });
  }
}
