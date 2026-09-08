import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const endpoint = body?.endpoint || '';
    const existing = await base44.entities.PushSubscription.filter({ owner_user_id: user.id });
    for (const row of existing) {
      if (!endpoint || row.endpoint === endpoint) {
        await base44.entities.PushSubscription.update(row.id, { enabled: false, last_seen_at: new Date().toISOString() });
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
