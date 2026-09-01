import type { HttpApp, HttpRequest, HttpResponse } from "./_core/httpTypes";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { chatMessages, plannerNotifications } from "../drizzle/schema";
import { createPlannerNotification, getDb, getEnabledReminderProfiles, getPlannerSnapshot, getPushSubscriptions, removePushSubscription } from "./db";

export function upcomingReminderDedupeKey(itemId: number, plannedAt: number, channel = "chat") {
  return `upcoming:${channel}:${itemId}:${plannedAt}`;
}

export function selectUpcomingReminder(items: Array<{ id: number; title: string; plannedAt: number; status: string }>, now: number, leadMinutes = 90) {
  return items.filter(item => item.status === "planned" && item.plannedAt >= now && item.plannedAt <= now + leadMinutes * 60_000).sort((a, b) => a.plannedAt - b.plannedAt)[0];
}

function isQuietTime(now: number, start: number, end: number) {
  if (start === end) return false;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(now));
  const minute = Number(parts.find(part => part.type === "hour")?.value ?? 0) * 60 + Number(parts.find(part => part.type === "minute")?.value ?? 0);
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

async function reserveDelivery(userId: number, itemId: number, plannedAt: number, channel: string, content: string) {
  return createPlannerNotification({ userId, plannerItemId: itemId, kind: `upcoming-${channel}`, dedupeKey: upcomingReminderDedupeKey(itemId, plannedAt, channel), content });
}

async function sendEmail(to: string, title: string, content: string) {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY não configurada");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${ENV.resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: ENV.emailFrom, to: [to], subject: `Lembrete: ${title}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2 style="color:#047857">Organiza AI</h2><p>${content}</p><p><a href="${process.env.APP_BASE_URL ?? ""}">Abrir meu planejamento</a></p></div>` }) });
  if (!response.ok) throw new Error(`Falha no e-mail: ${response.status}`);
}

async function sendPush(userId: number, itemId: number, title: string, content: string) {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) throw new Error("VAPID não configurado");
  webpush.setVapidDetails(ENV.vapidSubject, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  const subscriptions = await getPushSubscriptions(userId);
  const payload = JSON.stringify({ title: "Organiza AI", body: content, tag: `item-${itemId}`, url: "/calendar" });
  let delivered = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
      delivered += 1;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) await removePushSubscription(userId, subscription.endpoint);
      else console.error("[Push] delivery failed", error);
    }
  }
  if (!delivered) throw new Error("Nenhum dispositivo push ativo");
}

export async function deliverUpcomingReminder(userId: number, profile?: { reminderChannel?: "chat" | "email" | "push" | "both"; reminderLeadMinutes?: number; quietHoursStartMinute?: number; quietHoursEndMinute?: number; email?: string | null }) {
  const snapshot = await getPlannerSnapshot(userId);
  const now = Date.now();
  if (profile && isQuietTime(now, profile.quietHoursStartMinute ?? 1320, profile.quietHoursEndMinute ?? 420)) return { delivered: false as const, quiet: true as const };
  const next = selectUpcomingReminder(snapshot.items, now, profile?.reminderLeadMinutes ?? 90);
  if (!next) return { delivered: false as const };
  const time = new Date(next.plannedAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  const content = `“${next.title}” está planejado para ${time}.`;
  const channel = profile?.reminderChannel ?? "chat";
  const channels = channel === "both" ? ["email", "push"] : [channel];
  const delivered: string[] = [];
  for (const target of channels) {
    try {
      const dedupeKey = upcomingReminderDedupeKey(next.id, next.plannedAt, target);
      const db = await getDb();
      if (db) {
        const existing = await db.select({ id: plannerNotifications.id }).from(plannerNotifications).where(eq(plannerNotifications.dedupeKey, dedupeKey)).limit(1);
        if (existing.length) continue;
      }
      if (target === "chat") { const db = await getDb(); if (db) await db.insert(chatMessages).values({ userId, role: "assistant", content: `Lembrete: ${content}` }); }
      if (target === "email") {
        if (!profile?.email) throw new Error("Usuário sem e-mail para lembretes");
        await sendEmail(profile.email, next.title, content);
      }
      if (target === "push") await sendPush(userId, next.id, next.title, content);
      await reserveDelivery(userId, next.id, next.plannedAt, target, content);
      delivered.push(target);
    } catch (error) { console.error(`[Reminder:${target}]`, error); }
  }
  return { delivered: delivered.length > 0, itemId: next.id, channels: delivered } as const;
}

export function registerReminderRoutes(app: HttpApp) {
  const handler = async (req: HttpRequest, res: HttpResponse) => {
    const authorization = req.headers.authorization;
    if (!ENV.cronSecret || authorization !== `Bearer ${ENV.cronSecret}`) return res.status(401).json({ error: "unauthorized" });
    try {
      const profiles = await getEnabledReminderProfiles();
      const results = [];
      for (const profile of profiles) results.push({ userId: profile.userId, ...(await deliverUpcomingReminder(profile.userId, profile)) });
      return res.json({ ok: true, processed: profiles.length, results });
    } catch (error) {
      console.error("[Reminders] cron failed", error);
      return res.status(500).json({ error: "reminder-processing-failed" });
    }
  };
  app.get("/api/scheduled/reminders", handler);
  app.post("/api/scheduled/reminders", handler);
}
