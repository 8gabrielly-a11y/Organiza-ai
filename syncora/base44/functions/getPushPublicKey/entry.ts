import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    if (!publicKey) return Response.json({ error: 'VAPID_PUBLIC_KEY não configurada' }, { status: 500 });
    return Response.json({ publicKey });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
