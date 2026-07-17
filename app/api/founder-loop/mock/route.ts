import { NextRequest, NextResponse } from 'next/server';
import { runMockFounderLoop } from '@/lib/founderLoop';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const objective = typeof body?.objective === 'string' ? body.objective.trim() : '';

    if (!objective) {
      return NextResponse.json({ error: 'Objective is required.' }, { status: 400 });
    }

    if (objective.length > 3000) {
      return NextResponse.json({ error: 'Objective must be 3,000 characters or fewer.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, loop: runMockFounderLoop(objective) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to run the mocked founder loop.' },
      { status: 400 },
    );
  }
}
