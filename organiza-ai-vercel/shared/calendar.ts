export type CalendarItem = {
  plannedAt: number;
  durationMinutes: number;
  status: string;
  kind: "task" | "appointment" | "update" | string;
  parentItemId?: number | null;
};

export function startOfLocalDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function dayBounds(timestamp: number) {
  const start = startOfLocalDay(timestamp);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 1);
  return { start, end: endDate.getTime() };
}

export function zonedDayBounds(timestamp: number, timeZone = "America/Sao_Paulo") {
  const parts = zonedCalendarParts(timestamp, timeZone);
  if (timeZone === "America/Sao_Paulo") {
    const start = Date.UTC(parts.year, parts.month - 1, parts.day, 3);
    return { start, end: start + 24 * 60 * 60 * 1000 };
  }
  return dayBounds(timestamp);
}

export function tomorrowBounds(timestamp: number) {
  const tomorrow = new Date(startOfLocalDay(timestamp));
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayBounds(tomorrow.getTime());
}

export function startOfLocalWeek(timestamp: number) {
  const date = new Date(startOfLocalDay(timestamp));
  const day = date.getDay();
  const daysSinceMonday = (day + 6) % 7;
  date.setDate(date.getDate() - daysSinceMonday);
  return date.getTime();
}

export function weekDayStarts(timestamp: number) {
  const first = new Date(startOfLocalWeek(timestamp));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date.getTime();
  });
}

export function monthGridDayStarts(timestamp: number) {
  const current = new Date(timestamp);
  const firstOfMonth = new Date(current.getFullYear(), current.getMonth(), 1);
  const firstGridDay = new Date(firstOfMonth);
  const daysSinceMonday = (firstGridDay.getDay() + 6) % 7;
  firstGridDay.setDate(firstGridDay.getDate() - daysSinceMonday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + index);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  });
}

export function isSameLocalDay(firstTimestamp: number, secondTimestamp: number) {
  return startOfLocalDay(firstTimestamp) === startOfLocalDay(secondTimestamp);
}

export function itemsForDay<T extends CalendarItem>(items: T[], dayTimestamp: number) {
  const { start, end } = dayBounds(dayTimestamp);
  return items.filter(item => item.plannedAt >= start && item.plannedAt < end);
}

function zonedCalendarParts(timestamp: number, timeZone = "America/Sao_Paulo") {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(timestamp);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day") };
}

export function normalizeRelativeDateHint(text: string, plannedAt: number | null, now: number, timeZone = "America/Sao_Paulo") {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const offset = normalized.includes("depois de amanhã") || normalized.includes("depois de amanha")
    ? 2
    : normalized.includes("amanhã") || normalized.includes("amanha")
      ? 1
      : normalized.includes("hoje")
        ? 0
        : null;
  if (offset === null) return plannedAt;

  const base = zonedCalendarParts(now, timeZone);
  const timeMatch = normalized.match(/(?:às|as)\s*(\d{1,2})(?:h|:)\s*(\d{0,2})/i) ?? normalized.match(/\b(\d{1,2})h(\d{0,2})\b/i);
  const hour = timeMatch ? Number(timeMatch[1]) : 9;
  const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return plannedAt;

  // Organiza AI currently targets Brazilian Portuguese users. Convert the civil
  // time in São Paulo to UTC explicitly so a UTC server cannot move “amanhã”
  // into the wrong calendar day.
  if (timeZone === "America/Sao_Paulo") return Date.UTC(base.year, base.month - 1, base.day + offset, hour + 3, minute);

  const date = new Date(plannedAt ?? now);
  date.setFullYear(base.year, base.month - 1, base.day + offset);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

export type WeekdayRoutine = {
  title: string;
  groupName: string;
  days: number[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  occurrences: number[];
};

export function parseWeekdayRoutine(text: string, now: number, timeZone = "America/Sao_Paulo"): WeekdayRoutine | null {
  const normalized = text.toLocaleLowerCase("pt-BR");
  const daysMatch = normalized.match(/de\s+segunda(?:-feira)?\s+a\s+(quinta|sexta)(?:-feira)?/i);
  const timeMatch = normalized.match(/das?\s*(\d{1,2})(?:h|:)\s*(\d{0,2})?\s*(?:até\s+as?|as|a)\s*(\d{1,2})(?:h|:)\s*(\d{0,2})?/i);
  if (!daysMatch || !timeMatch || !/(trabalho|trabalhar)/i.test(normalized)) return null;
  const lastDay = daysMatch[1]?.startsWith("sexta") ? 5 : 4;
  const startHour = Number(timeMatch[1]);
  const startMinute = timeMatch[2] ? Number(timeMatch[2]) : 0;
  const endHour = Number(timeMatch[3]);
  const endMinute = timeMatch[4] ? Number(timeMatch[4]) : 0;
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return null;
  const base = zonedCalendarParts(now, timeZone);
  const occurrences: number[] = [];
  for (let offset = 0; offset < 60; offset += 1) {
    const date = new Date(Date.UTC(base.year, base.month - 1, base.day + offset));
    const weekday = date.getUTCDay();
    if (weekday >= 1 && weekday <= lastDay) {
      occurrences.push(timeZone === "America/Sao_Paulo" ? Date.UTC(base.year, base.month - 1, base.day + offset, startHour + 3, startMinute) : new Date(base.year, base.month - 1, base.day + offset, startHour, startMinute).getTime());
    }
  }
  return { title: "Trabalho", groupName: "Trabalho", days: Array.from({ length: lastDay }, (_, index) => index + 1), startHour, startMinute, endHour, endMinute, occurrences };
}

export function formatUserDateTime(timestamp: number, timeZone = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "short", timeStyle: "short" }).format(new Date(timestamp));
}

export function itemKindLabel(kind: CalendarItem["kind"]) {
  if (kind === "appointment") return "Compromisso";
  if (kind === "task") return "Tarefa";
  return "Atualização";
}
