import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const sub = body?.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return Response.json({ error: 'Assinatura push inválida' }, { status: 400 });
    }

    const existing = await base44.entities.PushSubscription.filter({ owner_user_id: user.id });
    const same = existing.find((x) => x.endpoint === sub.endpoint);
    const payload = {
      owner_user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: body?.userAgent || '',
      device_label: body?.deviceLabel || '',
      enabled: true,
      last_seen_at: new Date().toISOString(),
      last_error: ''
    };
    const saved = same
      ? await base44.entities.PushSubscription.update(same.id, payload)
      : await base44.entities.PushSubscription.create(payload);

    return Response.json({ ok: true, id: saved.id });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
