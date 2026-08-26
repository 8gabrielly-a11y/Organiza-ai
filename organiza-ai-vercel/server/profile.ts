import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { userProfiles } from "../drizzle/schema";

function encryptionKey() {
  return crypto.createHash("sha256").update(process.env.JWT_SECRET ?? "organiza-ai-local-key").digest();
}

export function encryptUserSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString("base64url")).join(".");
}

export function decryptUserSecret(value: string) {
  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function publicProfile<T extends { geminiKeyEncrypted?: string | null }>(profile: T | null): (Omit<T, "geminiKeyEncrypted"> & { geminiKeyEncrypted: undefined; hasGeminiKey: boolean }) | null {
  if (!profile) return null;
  const { geminiKeyEncrypted, ...safeProfile } = profile;
  return { ...safeProfile, geminiKeyEncrypted: undefined, hasGeminiKey: Boolean(geminiKeyEncrypted) } as Omit<T, "geminiKeyEncrypted"> & { geminiKeyEncrypted: undefined; hasGeminiKey: boolean };
}

export async function getOrCreateProfile(userId: number, fallbackName?: string | null, fallbackEmail?: string | null) {
  const db = await getDb(); if (!db) return null;
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(userProfiles).values({ userId, preferredName: fallbackName ?? null, email: fallbackEmail ?? null });
  const created = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return created[0] ?? null;
}

export async function getProfileByReminderScheduleUid(scheduleUid: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.reminderScheduleUid, scheduleUid)).limit(1);
  return result[0] ?? null;
}

export async function getProfile(userId: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}
