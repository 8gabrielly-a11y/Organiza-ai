export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runSyncora(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'syncora-push-cron' });
    }
    if (url.pathname === '/run' && request.method === 'POST') {
      const auth = request.headers.get('authorization') || '';
      if (!env.MANUAL_RUN_SECRET || auth !== `Bearer ${env.MANUAL_RUN_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      return runSyncora(env);
    }
    return new Response('Syncora push cron', { status: 200 });
  }
};

async function runSyncora(env) {
  if (!env.BASE44_CRON_URL || !env.CRON_SHARED_SECRET) {
    return Response.json({ ok: false, error: 'Configure BASE44_CRON_URL e CRON_SHARED_SECRET' }, { status: 500 });
  }
  const response = await fetch(env.BASE44_CRON_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-syncora-cron-secret': env.CRON_SHARED_SECRET
    },
    body: JSON.stringify({ source: 'cloudflare-cron' })
  });
  const text = await response.text();
  if (!response.ok) console.error('Syncora cron failed', response.status, text);
  return new Response(text, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || 'application/json' } });
}
