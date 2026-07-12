import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { getCompanies, updateApprovalStatus } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { action } = await req.json();
    const { id: rawId } = await params;
    const id = Number.parseInt(rawId, 10);

    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid approval id' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'hold') {
      return NextResponse.json({ error: 'Action must be approve or hold' }, { status: 400 });
    }

    const tenant = await getTenantId();
    const companies = await getCompanies(tenant);
    const company = companies.find((item) => item.approvals?.some((approval: any) => approval.id === id));

    if (!company) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    const approval = company.approvals.find((item: any) => item.id === id);
    if (!approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    await updateApprovalStatus({
      id,
      company_id: company.id,
      status: action === 'approve' ? 'approved' : 'held',
    });

    return NextResponse.json({
      id,
      company_id: company.id,
      status: action === 'approve' ? 'approved' : 'held',
      task_id: approval.task_id || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update approval' }, { status: 500 });
  }
}
