import crypto from "node:crypto";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, calendarConnections, chatMessages, passwordResetTokens, plannerGroups, plannerItems, plannerNotifications, users, userFeedback, plannerSubmodules, plannerRoutines, userProfiles } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (['name', 'email', 'loginMethod'] as const).forEach(field => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = values[field]; }
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  values.lastSignedIn ??= new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function createUserFeedback(values: { userId: number; category: "suggestion" | "problem" | "compliment" | "other"; message: string }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const result = await db.insert(userFeedback).values(values);
  return Number(result[0]?.insertId ?? 0);
}

export async function getUserFeedback() {
  const db = await getDb(); if (!db) return [];
  return db.select({ id: userFeedback.id, userId: userFeedback.userId, category: userFeedback.category, message: userFeedback.message, status: userFeedback.status, adminResponse: userFeedback.adminResponse, respondedAt: userFeedback.respondedAt, createdAt: userFeedback.createdAt, updatedAt: userFeedback.updatedAt, userName: users.name, userEmail: users.email }).from(userFeedback).leftJoin(users, eq(userFeedback.userId, users.id)).orderBy(desc(userFeedback.createdAt));
}

export async function getUserFeedbackForUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ id: userFeedback.id, category: userFeedback.category, message: userFeedback.message, status: userFeedback.status, adminResponse: userFeedback.adminResponse, respondedAt: userFeedback.respondedAt, createdAt: userFeedback.createdAt }).from(userFeedback).where(eq(userFeedback.userId, userId)).orderBy(desc(userFeedback.createdAt));
}

export async function respondToUserFeedback(id: number, response: string) {
  const db = await getDb(); if (!db) return false;
  await db.update(userFeedback).set({ adminResponse: response, respondedAt: new Date(), status: "read" }).where(eq(userFeedback.id, id));
  return true;
}

export async function markUserFeedbackRead(id: number) {
  const db = await getDb(); if (!db) return false;
  await db.update(userFeedback).set({ status: "read" }).where(eq(userFeedback.id, id));
  return true;
}

export async function clearUserChat(userId: number, context?: { groupId?: number; submodule?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const conditions = [eq(chatMessages.userId, userId)];
  if (context?.groupId) conditions.push(eq(chatMessages.groupId, context.groupId));
  if (context?.submodule) conditions.push(eq(chatMessages.submodule, context.submodule));
  await db.delete(chatMessages).where(and(...conditions));
  return true;
}

export async function deleteUserAccount(userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await tx.delete(plannerNotifications).where(eq(plannerNotifications.userId, userId));
    await tx.delete(userFeedback).where(eq(userFeedback.userId, userId));
    await tx.delete(chatMessages).where(eq(chatMessages.userId, userId));
    await tx.delete(plannerItems).where(eq(plannerItems.userId, userId));
    await tx.delete(plannerRoutines).where(eq(plannerRoutines.userId, userId));
    await tx.delete(plannerSubmodules).where(eq(plannerSubmodules.userId, userId));
    await tx.delete(plannerGroups).where(eq(plannerGroups.userId, userId));
    await tx.delete(calendarConnections).where(eq(calendarConnections.userId, userId));
    await tx.delete(userProfiles).where(eq(userProfiles.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
  return true;
}

export async function createPasswordResetToken(userId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(passwordResetTokens).values({ userId, tokenHash, expiresAt });
}

export async function consumePasswordResetToken(tokenHash: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);
  const token = rows[0];
  if (!token || token.usedAt || token.expiresAt.getTime() <= Date.now()) return undefined;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, token.id));
  return token;
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function getUserByEmail(email: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getPlannerSnapshot(userId: number) {
  const db = await getDb(); if (!db) return { groups: [], items: [], messages: [] };
  const [groups, items, messages] = await Promise.all([
    db.select().from(plannerGroups).where(eq(plannerGroups.userId, userId)).orderBy(asc(plannerGroups.createdAt)),
    db.select().from(plannerItems).where(eq(plannerItems.userId, userId)).orderBy(asc(plannerItems.plannedAt)),
    db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(desc(chatMessages.createdAt)).limit(40),
  ]);
  return { groups, items, messages: messages.reverse() };
}

export async function getUpcomingItems(userId: number, start: number, end: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(plannerItems).where(and(eq(plannerItems.userId, userId), gte(plannerItems.plannedAt, start), lte(plannerItems.plannedAt, end))).orderBy(asc(plannerItems.plannedAt));
}

export async function createPlannerNotification(values: { userId: number; plannerItemId: number; kind: string; dedupeKey: string; content: string }) {
  const db = await getDb(); if (!db) return false;
  const result = await db.insert(plannerNotifications).values(values).onDuplicateKeyUpdate({ set: { content: values.content } });
  return Number(result[0].affectedRows ?? 0) > 0;
}

export async function getRecentPlannerNotifications(userId: number, limit = 20) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(plannerNotifications).where(eq(plannerNotifications.userId, userId)).orderBy(desc(plannerNotifications.createdAt)).limit(limit);
}

export async function getCalendarConnectionByIcsToken(icsToken: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(calendarConnections).where(eq(calendarConnections.icsToken, icsToken)).limit(1);
  return result[0];
}

export async function getCalendarConnection(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(calendarConnections).where(eq(calendarConnections.userId, userId)).limit(1);
  return result[0];
}

export async function saveCalendarConnection(userId: number, values: { accessTokenEncrypted: string; refreshTokenEncrypted: string | null; expiresAt: number; calendarId?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const icsToken = crypto.randomBytes(48).toString("base64url");
  await db.insert(calendarConnections).values({ userId, accessTokenEncrypted: values.accessTokenEncrypted, refreshTokenEncrypted: values.refreshTokenEncrypted, expiresAt: values.expiresAt, calendarId: values.calendarId ?? "primary", icsToken }).onDuplicateKeyUpdate({ set: values });
  return getCalendarConnection(userId);
}

export async function removeCalendarConnection(userId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.delete(calendarConnections).where(eq(calendarConnections.userId, userId));
}

export async function ensureDefaultGroups(userId: number) {
  const db = await getDb(); if (!db) return [];
  const existing = await db.select().from(plannerGroups).where(eq(plannerGroups.userId, userId));
  if (existing.length) return existing;
  const defaults = [
    ['Faculdade', 'lavender'], ['Trabalho', 'blue'], ['Família', 'rose'],
    ['Casa', 'amber'], ['Vida adulta', 'teal'], ['Tarefas gerais', 'sage'],
  ] as const;
  await db.insert(plannerGroups).values(defaults.map(([name, color]) => ({ userId, name, color })));
  return db.select().from(plannerGroups).where(eq(plannerGroups.userId, userId));
}

export { calendarConnections, chatMessages, plannerGroups, plannerItems, plannerNotifications };
