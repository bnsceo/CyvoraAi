import { NextRequest, NextResponse } from 'next/server';
import { buildExecutiveBlueprint } from '@/lib/executiveBlueprint';
import { buildMockResearchPackage } from '@/lib/researchIntelligence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const objective = typeof body?.objective === 'string' ? body.objective.trim() : '';
    if (!objective) return NextResponse.json({ error: 'Objective is required.' }, { status: 400 });
    if (objective.length > 3000) return NextResponse.json({ error: 'Objective must be 3,000 characters or fewer.' }, { status: 400 });

    const research = buildMockResearchPackage(objective);
    const blueprint = buildExecutiveBlueprint(objective);

    return NextResponse.json({
      success: true,
      provider: 'mock',
      cost_usd: 0,
      operating_loop: {
        objective,
        research_id: research.id,
        blueprint_id: blueprint.id,
        next_required_state: 'founder_approval',
      },
      research,
      blueprint,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to research the opportunity and build a blueprint.' },
      { status: 400 }
    );
  }
}
