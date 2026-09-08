import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const CONNECTOR_ID = '6a9fdedbc5048920c14fd240';
const pad = (n) => String(n).padStart(2, '0');

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode || 'check';

    let connection;
    try {
      connection = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
    } catch (e) {
      return Response.json({ connected: false });
    }
    const authHeader = { Authorization: `Bearer ${connection.accessToken}` };

    if (mode === 'check') {
      const url =
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1&singleEvents=true&timeMin=' +
        new Date().toISOString();
      const res = await fetch(url, { headers: authHeader });
      return Response.json({ connected: res.ok });
    }

    // mode === 'sync'
    const now = new Date();
    const timeMin = new Date(now.getTime() - 7 * 86400000).toISOString();
    const timeMax = new Date(now.getTime() + 60 * 86400000).toISOString();
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&maxResults=250`;
    const res = await fetch(url, { headers: authHeader });
    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ connected: true, error: 'google_api_error', details: errText }, { status: 502 });
    }
    const data = await res.json();
    const events = (data.items || []).filter((e) => e.start && e.start.dateTime && e.status !== 'cancelled');

    const existing = await base44.entities.Commitment.filter({ source: 'google' });
    const seen = new Set(existing.map((c) => c.external_id).filter(Boolean));

    let created = 0;
    for (const ev of events) {
      if (seen.has(ev.id)) continue;
      const start = new Date(ev.start.dateTime);
      const end = ev.end && ev.end.dateTime ? new Date(ev.end.dateTime) : null;
      const d = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const t = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
      const et = end ? `${pad(end.getHours())}:${pad(end.getMinutes())}` : '';
      await base44.entities.Commitment.create({
        title: ev.summary || 'Compromisso',
        group_id: '',
        status: 'pending',
        scheduled_date: d,
        scheduled_time: t,
        end_time: et,
        location: ev.location || '',
        priority: 'medium',
        source: 'google',
        external_id: ev.id
      });
      created++;
    }
    return Response.json({ connected: true, imported: created, total: events.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}