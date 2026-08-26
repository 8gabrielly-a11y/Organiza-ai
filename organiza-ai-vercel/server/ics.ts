function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function formatUtc(timestamp: number) {
  return new Date(timestamp).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildPlannerIcs(items: Array<{ id: number; title: string; notes?: string | null; plannedAt: number; durationMinutes: number; status: string }>) {
  const events = items.filter(item => item.status !== "skipped").map(item => {
    const start = formatUtc(item.plannedAt);
    const end = formatUtc(item.plannedAt + item.durationMinutes * 60_000);
    const description = item.notes ? `\\n${escapeText(item.notes)}` : "";
    return [
      "BEGIN:VEVENT",
      `UID:organiza-${item.id}@organiza-ai`,
      `DTSTAMP:${formatUtc(Date.now())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeText(item.title)}`,
      description ? `DESCRIPTION:${description}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Organiza AI//Planner//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...events, "END:VCALENDAR", ""].join("\r\n");
}
