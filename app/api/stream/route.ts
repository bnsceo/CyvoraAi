import { NextRequest } from 'next/server';
import { EventEmitter } from 'events';
import { getTenantId } from '@/lib/tenant';
import { appendDurableEvent, listDurableEvents } from '@/lib/governanceStore';

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

export type ScopedEvent = { type: string; tenant?: string; companyId?: number | null; traceId?: string; payload?: unknown; message?: string };

export async function sendSSEEvent(data: ScopedEvent) {
  const tenant = data.tenant || 'default';
  const stored = await appendDurableEvent({ tenant, companyId: data.companyId || null, eventType: data.type, payload: data.payload || { message: data.message }, traceId: data.traceId });
  emitter.emit('message', stored);
  return stored;
}

export async function GET(req: NextRequest) {
  const tenant = await getTenantId();
  const rawCompanyId = req.nextUrl.searchParams.get('company_id');
  const companyId = rawCompanyId ? Number.parseInt(rawCompanyId, 10) : null;
  if (rawCompanyId && !Number.isFinite(companyId)) return new Response('Invalid company_id', { status: 400 });
  const headerCursor = req.headers.get('last-event-id');
  const queryCursor = req.nextUrl.searchParams.get('after');
  const afterId = Number.parseInt(headerCursor || queryCursor || '0', 10) || 0;
  let listener: ((event: any) => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: any) => controller.enqueue(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      for (const event of await listDurableEvents(tenant, companyId, afterId)) send(event);
      listener = (event) => {
        if (event.tenant !== tenant) return;
        if (companyId !== null && event.companyId !== companyId) return;
        try { send(event); } catch { if (listener) emitter.off('message', listener); }
      };
      emitter.on('message', listener);
      heartbeat = setInterval(() => { try { controller.enqueue(`: keepalive ${Date.now()}\n\n`); } catch {} }, 25000);
      req.signal.addEventListener('abort', () => { if (listener) emitter.off('message', listener); if (heartbeat) clearInterval(heartbeat); try { controller.close(); } catch {} });
    },
    cancel() { if (listener) emitter.off('message', listener); if (heartbeat) clearInterval(heartbeat); },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}

export { emitter };
