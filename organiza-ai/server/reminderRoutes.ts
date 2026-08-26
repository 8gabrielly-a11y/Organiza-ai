import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getDb, getPlannerSnapshot, createPlannerNotification, chatMessages } from "./db";
import { getProfileByReminderScheduleUid } from "./profile";

export function upcomingReminderDedupeKey(itemId: number, plannedAt: number) {
  return `upcoming:${itemId}:${plannedAt}`;
}

export function selectUpcomingReminder(items: Array<{ id: number; title: string; plannedAt: number; status: string }>, now: number) {
  return items.filter(item => item.status === "planned" && item.plannedAt >= now && item.plannedAt <= now + 90 * 60_000).sort((a, b) => a.plannedAt - b.plannedAt)[0];
}

export async function deliverUpcomingReminder(userId: number) {
  const snapshot = await getPlannerSnapshot(userId);
  const now = Date.now();
  const next = selectUpcomingReminder(snapshot.items, now);
  if (!next) return { delivered: false as const };
  const time = new Date(next.plannedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const content = `Lembrete: ${next.title} está planejado para ${time}.`;
  const dedupeKey = upcomingReminderDedupeKey(next.id, next.plannedAt);
  const inserted = await createPlannerNotification({ userId, plannerItemId: next.id, kind: "upcoming", dedupeKey, content });
  if (!inserted) return { delivered: false as const, duplicate: true as const };
  const db = await getDb();
  if (db) await db.insert(chatMessages).values({ userId, role: "assistant", content });
  return { delivered: true as const, itemId: next.id };
}

export function registerReminderRoutes(app: Express) {
  app.post("/api/scheduled/reminders", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const profile = await getProfileByReminderScheduleUid(user.taskUid);
      if (!profile) return res.json({ ok: true, skipped: "orphan" });
      const result = await deliverUpcomingReminder(profile.userId);
      return res.json({ ok: true, ...result });
    } catch (error) {
      console.error("[Reminders] scheduled callback failed", error);
      return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });
}
