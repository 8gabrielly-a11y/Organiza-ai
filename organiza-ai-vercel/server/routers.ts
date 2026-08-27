import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { and, eq, gte, like, lte } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { invokeGeminiJson } from "./gemini";
import { transcribeAudio } from "./_core/voiceTranscription";
import { storageGetSignedUrl, storagePut } from "./storage";
import { decryptUserSecret, encryptUserSecret, getOrCreateProfile, getProfile, publicProfile } from "./profile";
import { COOKIE_NAME } from "../shared/const";
import { formatUserDateTime, isSameLocalDay, normalizeRelativeDateHint, parseWeekdayRoutine } from "../shared/calendar";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { createHeartbeatJob, deleteHeartbeatJob } from "./_core/heartbeat";
import { createUserFeedback, getUserFeedback, getUserFeedbackForUser, respondToUserFeedback, createPasswordResetToken, consumePasswordResetToken, updateUserPassword, deleteUserAccount, clearUserChat, getDb, getPlannerSnapshot, ensureDefaultGroups, chatMessages, plannerGroups, plannerItems, getUserByEmail, getCalendarConnection, markUserFeedbackRead, removeCalendarConnection } from "./db";
import { cancelGoogleEvent, createGoogleEvent, getValidGoogleAccessToken, googleAuthorizationUrl, googleTitleForStatus, updateGoogleEvent } from "./googleCalendar";
import { calendarConnections, plannerRoutines, plannerRoutineExceptions, plannerSubmodules, userProfiles } from "../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { hashPassword, verifyPassword } from "./localAuth";
import { users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";

const authAttemptBuckets = new Map<string, number[]>();
function enforceAuthRateLimit(key: string) {
  const now = Date.now();
  const recent = (authAttemptBuckets.get(key) ?? []).filter(timestamp => now - timestamp < 15 * 60 * 1000);
  if (recent.length >= 8) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." });
  recent.push(now);
  authAttemptBuckets.set(key, recent);
}

type Extraction = {
  intent: "create" | "complete" | "skip" | "reschedule" | "chat";
  title: string | null;
  groupName: string | null;
  kind: "task" | "appointment" | "update";
  plannedAt: number | null;
  durationMinutes: number;
  targetText: string | null;
  parentTargetText: string | null;
  childTaskTitle: string | null;
  childTaskNotes: string | null;
  notes: string | null;
  response: string;
};

const extractionSchema = {
  type: "object",
  properties: {
    intent: { type: "string", enum: ["create", "complete", "skip", "reschedule", "chat"] },
    title: { type: ["string", "null"] },
    groupName: { type: ["string", "null"] },
    kind: { type: "string", enum: ["task", "appointment", "update"] },
    plannedAt: { type: ["integer", "null"] },
    durationMinutes: { type: "integer" },
    targetText: { type: ["string", "null"] },
    parentTargetText: { type: ["string", "null"] },
    childTaskTitle: { type: ["string", "null"] },
    childTaskNotes: { type: ["string", "null"] },
    notes: { type: ["string", "null"] },
    response: { type: "string" },
  },
  required: ["intent", "title", "groupName", "kind", "plannedAt", "durationMinutes", "targetText", "parentTargetText", "childTaskTitle", "childTaskNotes", "notes", "response"],
  additionalProperties: false,
} as const;

export function findPlannerConflicts(candidate: { plannedAt: number; durationMinutes: number }, occupied: Array<{ id?: number; title?: string; plannedAt: number; durationMinutes: number; status: string }> = []) {
  const end = candidate.plannedAt + candidate.durationMinutes * 60000;
  return occupied.filter(item => item.status === "planned" && candidate.plannedAt < item.plannedAt + item.durationMinutes * 60000 && end > item.plannedAt);
}

export function nextAvailable(now: number, occupied: Array<{ plannedAt: number; durationMinutes: number; status: string }> = [], durationMinutes = 30) {
  const date = new Date(now + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  if (date.getHours() < 8) date.setHours(8);
  if (date.getHours() >= 21) { date.setDate(date.getDate() + 1); date.setHours(8); }
  for (let attempt = 0; attempt < 24 * 14; attempt += 1) {
    const candidate = date.getTime();
    const conflicts = findPlannerConflicts({ plannedAt: candidate, durationMinutes }, occupied).length > 0;
    if (!conflicts && date.getHours() >= 8 && date.getHours() < 21) return candidate;
    date.setTime(candidate + 30 * 60000);
    if (date.getHours() >= 21) { date.setDate(date.getDate() + 1); date.setHours(8, 0, 0, 0); }
  }
  return date.getTime();
}

function contentOf(response: { choices?: Array<{ message?: { content?: unknown } }> }) {
  const value = response.choices?.[0]?.message?.content;
  return typeof value === "string" ? value : "{}";
}

export function statusForIntent(intent: "complete" | "skip") {
  return intent === "complete" ? "completed" as const : "skipped" as const;
}

export function buildPlannerItem(userId: number, groupId: number, extraction: Extraction, sourceMessageId: number, parentItemId: number | null = null, plannedAtOverride?: number | null, submodule: string | null = null) {
  if (!extraction.title) return null;
  const plannedAt = plannedAtOverride ?? extraction.plannedAt;
  const detailsNeeded = !plannedAt;
  return {
    userId,
    groupId,
    title: extraction.title,
    kind: extraction.kind,
    plannedAt: plannedAt ?? nextAvailable(Date.now()),
    durationMinutes: extraction.durationMinutes,
    notes: extraction.notes,
    sourceMessageId,
    parentItemId,
    submodule,
    detailsNeeded,
  } as const;
}

export function buildChildTaskItem(userId: number, groupId: number, parentItemId: number, parentPlannedAt: number, title: string, notes: string | null, sourceMessageId: number, submodule: string | null = null) {
  return {
    userId,
    groupId,
    title,
    kind: "task" as const,
    plannedAt: parentPlannedAt,
    durationMinutes: 30,
    notes,
    sourceMessageId,
    parentItemId,
    submodule,
    detailsNeeded: false,
  } as const;
}

type PlannerCreationDb = Pick<NonNullable<Awaited<ReturnType<typeof getDb>>>, "insert">;

export async function persistPlannerCreation({ db, userId, snapshot, extraction, sourceMessageId, submodule = null }: { db: PlannerCreationDb; userId: number; snapshot: Awaited<ReturnType<typeof getPlannerSnapshot>>; extraction: Extraction; sourceMessageId: number; submodule?: string | null }) {
  const group = snapshot.groups.find(item => item.name.toLowerCase() === extraction.groupName?.toLowerCase()) ?? snapshot.groups.find(item => item.name === "Tarefas gerais");
  if (!group) return { persisted: false as const, plannerItemId: null, item: null };
  const explicitParent = snapshot.items.find(item => extraction.parentTargetText && item.title.toLowerCase().includes(extraction.parentTargetText.toLowerCase()) && item.kind === "appointment");
  const routineParent = !explicitParent && extraction.kind === "task" && extraction.plannedAt
    ? snapshot.items.find(item => item.userId === userId && item.groupId === group.id && item.kind === "appointment" && item.notes === "Rotina recorrente" && isSameLocalDay(item.plannedAt, extraction.plannedAt as number))
    : undefined;
  const parent = explicitParent ?? routineParent;
  if (parent && extraction.childTaskTitle) {
    await db.insert(plannerItems).values(buildChildTaskItem(userId, group.id, parent.id, parent.plannedAt, extraction.childTaskTitle, extraction.childTaskNotes ?? extraction.notes, sourceMessageId, submodule));
    return { persisted: true as const, plannerItemId: null, item: null };
  }
  const item = buildPlannerItem(userId, group.id, extraction, sourceMessageId, routineParent?.id ?? null, undefined, submodule);
  if (!item) return { persisted: false as const, plannerItemId: null, item: null };
  const inserted = await db.insert(plannerItems).values(item);
  const plannerItemId = Number(inserted[0]?.insertId ?? 0);
  if (extraction.childTaskTitle) await db.insert(plannerItems).values(buildChildTaskItem(userId, group.id, plannerItemId, item.plannedAt, extraction.childTaskTitle, extraction.childTaskNotes, sourceMessageId, submodule));
  return { persisted: true as const, plannerItemId, item };
}

export async function persistWeekdayRoutine({ db, userId, snapshot, routine, sourceMessageId }: { db: PlannerCreationDb; userId: number; snapshot: Awaited<ReturnType<typeof getPlannerSnapshot>>; routine: ReturnType<typeof parseWeekdayRoutine>; sourceMessageId: number }) {
  if (!routine) return { persisted: false as const, createdCount: 0 };
  const group = snapshot.groups.find(item => item.name.toLowerCase() === routine.groupName.toLowerCase()) ?? snapshot.groups.find(item => item.name === "Tarefas gerais");
  if (!group) return { persisted: false as const, createdCount: 0 };
  let createdCount = 0;
  for (const plannedAt of routine.occurrences) {
    const duplicate = snapshot.items.some(item => item.userId === userId && item.title === routine.title && item.kind === "appointment" && item.plannedAt === plannedAt);
    if (duplicate) continue;
    await db.insert(plannerItems).values({ userId, groupId: group.id, title: routine.title, notes: "Rotina recorrente", kind: "appointment", status: "planned", plannedAt, durationMinutes: Math.max(30, (routine.endHour * 60 + routine.endMinute) - (routine.startHour * 60 + routine.startMinute)), sourceMessageId, detailsNeeded: false });
    createdCount += 1;
  }
  return { persisted: createdCount > 0, createdCount } as const;
}

export function routineOccurrences(startMinute: number, endMinute: number, daysOfWeek: number[], commuteBeforeMinutes: number, commuteAfterMinutes: number, now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(now));
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0);
  const occurrences: number[] = [];
  for (let offset = 0; offset < 60; offset += 1) {
    const date = new Date(Date.UTC(value("year"), value("month") - 1, value("day") + offset));
    if (daysOfWeek.includes(date.getUTCDay())) {
      const absoluteStart = startMinute - commuteBeforeMinutes;
      const startHour = Math.floor(absoluteStart / 60);
      const startMin = ((absoluteStart % 60) + 60) % 60;
      occurrences.push(Date.UTC(value("year"), value("month") - 1, value("day") + offset, startHour + 3, startMin));
    }
  }
  return occurrences;
}

export function creationAssistantResponse(extraction: Extraction, persisted: boolean) {
  const claimsPersistence = /\b(agendei|anotei|registrei|guardei|organizei)\b/i.test(extraction.response);
  if (!persisted && claimsPersistence) return "Entendi. Ainda não coloquei isso na Agenda; posso transformar em tarefa ou compromisso se você me disser o que deve ser criado.";
  if (extraction.intent === "create" && !persisted) return "Posso organizar isso, mas preciso do nome da tarefa ou compromisso para colocar na sua agenda.";
  return extraction.response;
}

export function parseExtraction(raw: string): Extraction {
  try {
    const parsed = JSON.parse(raw) as Partial<Extraction>;
    if (!parsed.intent || !parsed.response) throw new Error("invalid extraction");
    return {
      intent: parsed.intent,
      title: parsed.title ?? null,
      groupName: parsed.groupName ?? null,
      kind: parsed.kind ?? "update",
      plannedAt: parsed.plannedAt ?? null,
      durationMinutes: parsed.durationMinutes ?? 30,
      targetText: parsed.targetText ?? null,
      parentTargetText: parsed.parentTargetText ?? null,
      childTaskTitle: parsed.childTaskTitle ?? null,
      childTaskNotes: parsed.childTaskNotes ?? null,
      notes: parsed.notes ?? null,
      response: parsed.response,
    };
  } catch {
    return { intent: "chat", title: null, groupName: null, kind: "update", plannedAt: null, durationMinutes: 30, targetText: null, parentTargetText: null, childTaskTitle: null, childTaskNotes: null, notes: null, response: "Entendi. Pode me dizer se quer registrar isso, concluir algo ou reagendar?" };
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(z.object({ name: z.string().min(2).max(120), email: z.string().email().max(320), password: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const email = input.email.trim().toLowerCase();
      if (await getUserByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "Não foi possível criar a conta com este e-mail." });
      const openId = `local_${crypto.randomUUID().replace(/-/g, "")}`;
      await db.insert(users).values({ openId, name: input.name.trim(), email, passwordHash: await hashPassword(input.password), loginMethod: "email" });
      const session = await sdk.signSession({ openId, appId: ENV.appId, name: input.name.trim() });
      ctx.res.cookie(COOKIE_NAME, session, getSessionCookieOptions(ctx.req));
      return { success: true } as const;
    }),
    login: publicProcedure.input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      enforceAuthRateLimit(`login:${input.email.toLowerCase()}:${ctx.req.ip ?? "unknown"}`);
      const user = await getUserByEmail(input.email.trim().toLowerCase());
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha inválidos." });
      const session = await sdk.signSession({ openId: user.openId, appId: ENV.appId, name: user.name ?? user.email ?? "" });
      ctx.res.cookie(COOKIE_NAME, session, getSessionCookieOptions(ctx.req));
      return { success: true } as const;
    }),
    requestPasswordReset: publicProcedure.input(z.object({ email: z.string().email().max(320) })).mutation(async ({ ctx, input }) => {
      enforceAuthRateLimit(`reset:${input.email.toLowerCase()}:${ctx.req.ip ?? "unknown"}`);
      const email = input.email.trim().toLowerCase();
      const user = await getUserByEmail(email);
      if (user?.passwordHash) {
        const rawToken = crypto.randomBytes(32).toString("base64url");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        await createPasswordResetToken(user.id, tokenHash, new Date(Date.now() + 30 * 60 * 1000));
        const recipient = process.env.RESEND_TEST_RECIPIENT || email;
        const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
        if (process.env.RESEND_API_KEY && recipient === email) {
          await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `password-reset-${tokenHash}` }, body: JSON.stringify({ from: "Organiza AI <onboarding@resend.dev>", to: [recipient], subject: "Redefina sua senha do Organiza AI", text: `Use este link para redefinir sua senha: ${baseUrl}/reset-password?token=${rawToken}. O link expira em 30 minutos.` }) });
        }
      }
      return { success: true } as const;
    }),
    resetPassword: publicProcedure.input(z.object({ token: z.string().min(20), password: z.string().min(8).max(128) })).mutation(async ({ input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
      const token = await consumePasswordResetToken(tokenHash);
      if (!token) throw new TRPCError({ code: "BAD_REQUEST", message: "Este link é inválido ou expirou." });
      await updateUserPassword(token.userId, await hashPassword(input.password));
      return { success: true } as const;
    }),
    clearChat: protectedProcedure.input(z.object({ groupId: z.number().int().positive().optional(), submodule: z.string().trim().min(2).max(120).optional() }).optional()).mutation(async ({ ctx, input }) => {
      await clearUserChat(ctx.user.id, input ?? undefined);
      return { success: true } as const;
    }),
    deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      await deleteUserAccount(ctx.user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  feedback: router({
    submit: protectedProcedure.input(z.object({ category: z.enum(["suggestion", "problem", "compliment", "other"]), message: z.string().trim().min(5).max(3000) })).mutation(async ({ ctx, input }) => {
      await createUserFeedback({ userId: ctx.user.id, category: input.category, message: input.message.trim() });
      return { success: true } as const;
    }),
    inbox: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem consultar feedbacks." });
      return getUserFeedback();
    }),
    myFeedback: protectedProcedure.query(async ({ ctx }) => getUserFeedbackForUser(ctx.user.id)),
    respond: protectedProcedure.input(z.object({ id: z.number().int().positive(), response: z.string().trim().min(2).max(3000) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem responder feedbacks." });
      await respondToUserFeedback(input.id, input.response.trim());
      return { success: true } as const;
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem atualizar feedbacks." });
      await markUserFeedbackRead(input.id);
      return { success: true } as const;
    }),
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getOrCreateProfile(ctx.user.id, ctx.user.name, ctx.user.email);
      return publicProfile(profile);
    }),
    completeOnboarding: protectedProcedure.input(z.object({ preferredName: z.string().min(1).max(120), communicationTone: z.enum(["gentle", "balanced", "direct"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.insert(userProfiles).values({ userId: ctx.user.id, preferredName: input.preferredName, email: ctx.user.email ?? null, communicationTone: input.communicationTone, onboardingComplete: 1 }).onDuplicateKeyUpdate({ set: { preferredName: input.preferredName, communicationTone: input.communicationTone, onboardingComplete: 1 } });
      return { success: true };
    }),
    updateTone: protectedProcedure.input(z.object({ communicationTone: z.enum(["gentle", "balanced", "direct"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await getOrCreateProfile(ctx.user.id, ctx.user.name, ctx.user.email);
      await db.update(userProfiles).set({ communicationTone: input.communicationTone }).where(eq(userProfiles.userId, ctx.user.id));
      return { success: true };
    }),
    saveGeminiKey: protectedProcedure.input(z.object({ apiKey: z.string().min(10).max(300) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await getOrCreateProfile(ctx.user.id, ctx.user.name, ctx.user.email);
      await db.update(userProfiles).set({ geminiKeyEncrypted: encryptUserSecret(input.apiKey) }).where(eq(userProfiles.userId, ctx.user.id));
      return { success: true };
    }),
    removeGeminiKey: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.update(userProfiles).set({ geminiKeyEncrypted: null }).where(eq(userProfiles.userId, ctx.user.id));
      return { success: true };
    }),
  }),
  reminders: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getOrCreateProfile(ctx.user.id, ctx.user.name, ctx.user.email);
      return { enabled: Boolean(profile?.reminderScheduleUid), channel: profile?.reminderChannel ?? "chat", leadMinutes: profile?.reminderLeadMinutes ?? 30, quietStartMinute: profile?.quietHoursStartMinute ?? 1320, quietEndMinute: profile?.quietHoursEndMinute ?? 420 };
    }),
    updatePreferences: protectedProcedure.input(z.object({ channel: z.enum(["chat", "email"]), leadMinutes: z.number().int().min(5).max(1440), quietStartMinute: z.number().int().min(0).max(1439), quietEndMinute: z.number().int().min(0).max(1439) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(userProfiles).set({ reminderChannel: input.channel, reminderLeadMinutes: input.leadMinutes, quietHoursStartMinute: input.quietStartMinute, quietHoursEndMinute: input.quietEndMinute }).where(eq(userProfiles.userId, ctx.user.id));
      return { success: true } as const;
    }),
    enable: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const profile = await getOrCreateProfile(ctx.user.id, ctx.user.name, ctx.user.email);
      if (!profile) throw new Error("Perfil indisponível");
      if (profile.reminderScheduleUid) return { enabled: true } as const;
      const cookieHeader = typeof ctx.req.headers.cookie === "string" ? ctx.req.headers.cookie : "";
      const sessionToken = parseCookie(cookieHeader)[COOKIE_NAME] ?? "";
      const job = await createHeartbeatJob({ name: `organiza-reminders-${ctx.user.id}`, cron: "0 */15 * * * *", path: "/api/scheduled/reminders", description: "Lembretes conversacionais do Organiza AI" }, sessionToken);
      await db.update(userProfiles).set({ reminderScheduleUid: job.taskUid }).where(eq(userProfiles.userId, ctx.user.id));
      return { enabled: true, nextExecutionAt: job.nextExecutionAt ?? null } as const;
    }),
    disable: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const profile = await getOrCreateProfile(ctx.user.id, ctx.user.name, ctx.user.email);
      if (profile?.reminderScheduleUid) {
        const cookieHeader = typeof ctx.req.headers.cookie === "string" ? ctx.req.headers.cookie : "";
        const sessionToken = parseCookie(cookieHeader)[COOKIE_NAME] ?? "";
        await deleteHeartbeatJob(profile.reminderScheduleUid, sessionToken);
        await db.update(userProfiles).set({ reminderScheduleUid: null }).where(eq(userProfiles.userId, ctx.user.id));
      }
      return { enabled: false } as const;
    }),
  }),
  calendar: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const connection = await getCalendarConnection(ctx.user.id);
      const host = ctx.req.get("host");
      const protocol = ctx.req.headers["x-forwarded-proto"]?.toString().split(",")[0] ?? ctx.req.protocol;
      const subscriptionUrl = connection?.icsToken && host ? `${protocol}://${host}/api/calendar/ics/${connection.icsToken}` : null;
      return { connected: Boolean(connection?.refreshTokenEncrypted), provider: connection?.provider ?? null, calendarId: connection?.calendarId ?? null, subscriptionUrl };
    }),
    connect: protectedProcedure.query(({ ctx }) => ({ authorizationUrl: googleAuthorizationUrl(ctx.user.id) })),
    disconnect: protectedProcedure.mutation(async ({ ctx }) => {
      await removeCalendarConnection(ctx.user.id);
      return { success: true } as const;
    }),
  }),
  planner: router({
    snapshot: protectedProcedure.query(async ({ ctx }) => {
      await ensureDefaultGroups(ctx.user.id);
      return getPlannerSnapshot(ctx.user.id);
    }),
    groupSnapshot: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const snapshot = await getPlannerSnapshot(ctx.user.id);
      const group = snapshot.groups.find(item => item.id === input.groupId);
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Grupo não encontrado." });
      return { group, items: snapshot.items.filter(item => item.groupId === group.id), messages: snapshot.messages.filter(message => message.groupId === group.id) };
    }),
    submodules: protectedProcedure.input(z.object({ groupId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const group = (await db.select().from(plannerGroups).where(and(eq(plannerGroups.id, input.groupId), eq(plannerGroups.userId, ctx.user.id))).limit(1))[0];
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Grupo não encontrado." });
      return db.select().from(plannerSubmodules).where(and(eq(plannerSubmodules.groupId, input.groupId), eq(plannerSubmodules.userId, ctx.user.id)));
    }),
    createSubmodule: protectedProcedure.input(z.object({ groupId: z.number().int().positive(), name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const group = (await db.select().from(plannerGroups).where(and(eq(plannerGroups.id, input.groupId), eq(plannerGroups.userId, ctx.user.id))).limit(1))[0];
      if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Grupo não encontrado." });
      const name = input.name.trim();
      const duplicate = (await db.select().from(plannerSubmodules).where(and(eq(plannerSubmodules.groupId, input.groupId), eq(plannerSubmodules.userId, ctx.user.id), eq(plannerSubmodules.name, name))).limit(1))[0];
      if (duplicate) return duplicate;
      const inserted = await db.insert(plannerSubmodules).values({ userId: ctx.user.id, groupId: input.groupId, name });
      return { id: Number(inserted[0]?.insertId ?? 0), userId: ctx.user.id, groupId: input.groupId, name, createdAt: new Date() };
    }),
    renameSubmodule: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const target = (await db.select().from(plannerSubmodules).where(and(eq(plannerSubmodules.id, input.id), eq(plannerSubmodules.userId, ctx.user.id))).limit(1))[0];
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Subtema não encontrado." });
      await db.update(plannerSubmodules).set({ name: input.name.trim() }).where(and(eq(plannerSubmodules.id, input.id), eq(plannerSubmodules.userId, ctx.user.id)));
      await db.update(plannerItems).set({ submodule: input.name.trim() }).where(and(eq(plannerItems.userId, ctx.user.id), eq(plannerItems.groupId, target.groupId), eq(plannerItems.submodule, target.name)));
      await db.update(chatMessages).set({ submodule: input.name.trim() }).where(and(eq(chatMessages.userId, ctx.user.id), eq(chatMessages.groupId, target.groupId), eq(chatMessages.submodule, target.name)));
      return { success: true } as const;
    }),
    createGroup: protectedProcedure.input(z.object({ name: z.string().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await db.insert(plannerGroups).values({ userId: ctx.user.id, name: input.name, color: "sage" });
      return { success: true };
    }),
    routines: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      return db.select().from(plannerRoutines).where(eq(plannerRoutines.userId, ctx.user.id));
    }),
    createRoutine: protectedProcedure.input(z.object({ title: z.string().min(2).max(220), groupId: z.number().int().positive().optional(), daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1439), commuteBeforeMinutes: z.number().int().min(0).max(240).default(0), commuteAfterMinutes: z.number().int().min(0).max(240).default(0) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const groups = await ensureDefaultGroups(ctx.user.id);
      const group = input.groupId ? groups.find(item => item.id === input.groupId) : groups.find(item => item.name.toLowerCase() === input.title.trim().toLowerCase()) ?? groups.find(item => item.name === "Tarefas gerais");
      if (!group || input.endMinute <= input.startMinute) throw new TRPCError({ code: "BAD_REQUEST", message: "Revise o grupo e os horários do compromisso." });
      const daysKey = [...input.daysOfWeek].sort((a, b) => a - b).join(",");
      const existing = await db.select().from(plannerRoutines).where(and(eq(plannerRoutines.userId, ctx.user.id), eq(plannerRoutines.title, input.title.trim()), eq(plannerRoutines.daysOfWeek, daysKey), eq(plannerRoutines.startMinute, input.startMinute), eq(plannerRoutines.endMinute, input.endMinute))).limit(1);
      if (existing[0]) return { success: true, routineId: existing[0].id, createdCount: 0 };
      const occurrences = routineOccurrences(input.startMinute, input.endMinute, input.daysOfWeek, input.commuteBeforeMinutes, input.commuteAfterMinutes);
      const created = await db.insert(plannerRoutines).values({ userId: ctx.user.id, groupId: group.id, title: input.title.trim(), daysOfWeek: daysKey, startMinute: input.startMinute, endMinute: input.endMinute, commuteBeforeMinutes: input.commuteBeforeMinutes, commuteAfterMinutes: input.commuteAfterMinutes, active: true });
      const routineId = Number(created[0]?.insertId ?? 0);
      for (const plannedAt of occurrences) await db.insert(plannerItems).values({ userId: ctx.user.id, groupId: group.id, title: input.title.trim(), kind: "appointment", status: "planned", plannedAt, durationMinutes: input.endMinute - input.startMinute + input.commuteBeforeMinutes + input.commuteAfterMinutes, notes: `Compromisso fixo${input.commuteBeforeMinutes || input.commuteAfterMinutes ? ` · deslocamento: ${input.commuteBeforeMinutes} min antes / ${input.commuteAfterMinutes} min depois` : ""}`, detailsNeeded: false });
      return { success: true, routineId, createdCount: occurrences.length };
    }),
    updateRoutine: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(2).max(220).optional(), commuteBeforeMinutes: z.number().int().min(0).max(240).optional(), commuteAfterMinutes: z.number().int().min(0).max(240).optional(), active: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const routine = (await db.select().from(plannerRoutines).where(and(eq(plannerRoutines.id, input.id), eq(plannerRoutines.userId, ctx.user.id))).limit(1))[0];
      if (!routine) throw new TRPCError({ code: "NOT_FOUND", message: "Rotina não encontrada." });
      const updates = { ...(input.title === undefined ? {} : { title: input.title }), ...(input.commuteBeforeMinutes === undefined ? {} : { commuteBeforeMinutes: input.commuteBeforeMinutes }), ...(input.commuteAfterMinutes === undefined ? {} : { commuteAfterMinutes: input.commuteAfterMinutes }), ...(input.active === undefined ? {} : { active: input.active }) };
      await db.update(plannerRoutines).set(updates).where(and(eq(plannerRoutines.id, input.id), eq(plannerRoutines.userId, ctx.user.id)));
      if (input.active !== undefined) await db.update(plannerItems).set({ status: input.active ? "planned" : "skipped" }).where(and(eq(plannerItems.userId, ctx.user.id), eq(plannerItems.groupId, routine.groupId ?? 0), eq(plannerItems.title, routine.title), like(plannerItems.notes, "Rotina%")));
      return { success: true } as const;
    }),
    skipRoutineOccurrence: protectedProcedure.input(z.object({ id: z.number().int().positive(), dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const routine = (await db.select().from(plannerRoutines).where(and(eq(plannerRoutines.id, input.id), eq(plannerRoutines.userId, ctx.user.id))).limit(1))[0];
      if (!routine) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(plannerRoutineExceptions).values({ userId: ctx.user.id, routineId: routine.id, dateKey: input.dateKey });
      const dayStart = new Date(`${input.dateKey}T00:00:00-03:00`).getTime();
      await db.update(plannerItems).set({ status: "skipped" }).where(and(eq(plannerItems.userId, ctx.user.id), eq(plannerItems.groupId, routine.groupId ?? 0), eq(plannerItems.title, routine.title), like(plannerItems.notes, "Rotina%"), gte(plannerItems.plannedAt, dayStart), lte(plannerItems.plannedAt, dayStart + 24 * 60 * 60 * 1000 - 1)));
      return { success: true } as const;
    }),
    pauseRoutine: protectedProcedure.input(z.object({ id: z.number().int().positive(), paused: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const routine = (await db.select().from(plannerRoutines).where(and(eq(plannerRoutines.id, input.id), eq(plannerRoutines.userId, ctx.user.id))).limit(1))[0];
      if (!routine) throw new TRPCError({ code: "NOT_FOUND", message: "Rotina não encontrada." });
      await db.update(plannerRoutines).set({ active: !input.paused }).where(and(eq(plannerRoutines.id, input.id), eq(plannerRoutines.userId, ctx.user.id)));
      await db.update(plannerItems).set({ status: input.paused ? "skipped" : "planned" }).where(and(eq(plannerItems.userId, ctx.user.id), eq(plannerItems.groupId, routine.groupId ?? 0), eq(plannerItems.title, routine.title), like(plannerItems.notes, "Rotina%")));
      return { success: true, active: !input.paused } as const;
    }),
    deleteRoutine: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const routine = (await db.select().from(plannerRoutines).where(and(eq(plannerRoutines.id, input.id), eq(plannerRoutines.userId, ctx.user.id))).limit(1))[0];
      if (!routine) throw new TRPCError({ code: "NOT_FOUND", message: "Rotina não encontrada." });
      await db.delete(plannerItems).where(and(eq(plannerItems.userId, ctx.user.id), eq(plannerItems.groupId, routine.groupId ?? 0), eq(plannerItems.title, routine.title), like(plannerItems.notes, "Rotina%")));
      await db.delete(plannerRoutines).where(and(eq(plannerRoutines.id, input.id), eq(plannerRoutines.userId, ctx.user.id)));
      return { success: true } as const;
    }),
    rescheduleItem: protectedProcedure.input(z.object({ id: z.number().int().positive(), plannedAt: z.number().int(), durationMinutes: z.number().int().min(5).max(1440) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const item = (await db.select().from(plannerItems).where(and(eq(plannerItems.id, input.id), eq(plannerItems.userId, ctx.user.id))).limit(1))[0];
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado." });
      const snapshot = await getPlannerSnapshot(ctx.user.id);
      const occupied = snapshot.items.filter(candidate => candidate.id !== item.id && candidate.status === "planned" && candidate.kind !== "update");
      const conflicts = findPlannerConflicts({ plannedAt: input.plannedAt, durationMinutes: input.durationMinutes }, occupied);
      if (conflicts.length) throw new TRPCError({ code: "CONFLICT", message: `O novo horário conflita com ${conflicts.slice(0, 2).map(candidate => `“${candidate.title}”`).join(" e ")}.` });
      await db.update(plannerItems).set({ plannedAt: input.plannedAt, durationMinutes: input.durationMinutes }).where(and(eq(plannerItems.id, item.id), eq(plannerItems.userId, ctx.user.id)));
      return { success: true } as const;
    }),
    updateStatus: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["completed", "skipped"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const target = (await getPlannerSnapshot(ctx.user.id)).items.find(item => item.id === input.id);
      await db.update(plannerItems).set({ status: input.status }).where(and(eq(plannerItems.id, input.id), eq(plannerItems.userId, ctx.user.id)));
      if (target?.googleEventId) {
        const connection = await getCalendarConnection(ctx.user.id);
        const validToken = connection ? await getValidGoogleAccessToken(connection) : null;
        if (validToken && input.status === "skipped") await cancelGoogleEvent(validToken.accessToken, target.googleEventId, connection?.calendarId);
        if (validToken && input.status === "completed") await updateGoogleEvent(validToken.accessToken, target.googleEventId, { title: googleTitleForStatus(target.title, input.status), notes: target.notes, plannedAt: target.plannedAt, durationMinutes: target.durationMinutes, calendarId: connection?.calendarId });
      }
      return { success: true };
    }),
    reschedule: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      const snapshot = await getPlannerSnapshot(ctx.user.id);
      const target = snapshot.items.find(item => item.id === input.id);
      const plannedAt = nextAvailable(Date.now(), snapshot.items, target?.durationMinutes ?? 30);
      await db.update(plannerItems).set({ status: "planned", plannedAt }).where(and(eq(plannerItems.id, input.id), eq(plannerItems.userId, ctx.user.id)));
      if (target?.googleEventId) {
        const connection = await getCalendarConnection(ctx.user.id);
        const validToken = connection ? await getValidGoogleAccessToken(connection) : null;
        if (validToken) await updateGoogleEvent(validToken.accessToken, target.googleEventId, { title: target.title, notes: target.notes, plannedAt, durationMinutes: target.durationMinutes, calendarId: connection?.calendarId });
      }
      return { success: true, plannedAt };
    }),
    transcribeAudio: protectedProcedure.input(z.object({ audioBase64: z.string().min(1).max(22500000), mimeType: z.enum(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]) })).mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.audioBase64, "base64");
      if (bytes.length > 16 * 1024 * 1024) throw new Error("Áudio excede o limite de 16 MB");
      const upload = await storagePut(`voice/${ctx.user.id}/capture.webm`, bytes, input.mimeType);
      const signedUrl = await storageGetSignedUrl(upload.key);
      const result = await transcribeAudio({ audioUrl: signedUrl, language: "pt", prompt: "Transcreva uma anotação pessoal sobre tarefa, compromisso ou atualização." });
      if (!("text" in result)) throw new Error("Não foi possível transcrever o áudio");
      return { text: result.text };
    }),
    sendMessage: protectedProcedure.input(z.object({ content: z.string().min(1).max(2000), groupId: z.number().int().positive().optional(), submodule: z.string().trim().min(2).max(120).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Database unavailable");
      await ensureDefaultGroups(ctx.user.id);
      const fullSnapshot = await getPlannerSnapshot(ctx.user.id);
      const activeGroup = input.groupId ? fullSnapshot.groups.find(item => item.id === input.groupId) : undefined;
      if (input.groupId && !activeGroup) throw new TRPCError({ code: "NOT_FOUND", message: "Grupo não encontrado." });
      if (input.submodule && !activeGroup) throw new TRPCError({ code: "BAD_REQUEST", message: "O subtema precisa pertencer a um grupo." });
      if (input.submodule) {
        const dbSubmodules = await db.select().from(plannerSubmodules).where(and(eq(plannerSubmodules.userId, ctx.user.id), eq(plannerSubmodules.groupId, activeGroup!.id), eq(plannerSubmodules.name, input.submodule))).limit(1);
        if (!dbSubmodules[0]) await db.insert(plannerSubmodules).values({ userId: ctx.user.id, groupId: activeGroup!.id, name: input.submodule });
      }
      const snapshot = activeGroup ? { ...fullSnapshot, groups: [activeGroup], items: fullSnapshot.items.filter(item => item.groupId === activeGroup.id), messages: fullSnapshot.messages.filter(message => message.groupId === activeGroup.id) } : fullSnapshot;
      const profile = await getOrCreateProfile(ctx.user.id, ctx.user.name, ctx.user.email);
      const userMessage = await db.insert(chatMessages).values({ userId: ctx.user.id, groupId: activeGroup?.id ?? null, submodule: input.submodule ?? null, role: "user", content: input.content });
      const now = Date.now();
      const routine = parseWeekdayRoutine(input.content, now);
      if (routine) {
        const routineResult = await persistWeekdayRoutine({ db, userId: ctx.user.id, snapshot, routine, sourceMessageId: Number(userMessage[0].insertId) });
        const dayLabel = routine.days.length === 5 ? "sexta" : "quinta";
        const assistantText = routineResult.persisted ? `Registrei sua rotina de trabalho de segunda a ${dayLabel}, das ${String(routine.startHour).padStart(2, "0")}:${String(routine.startMinute).padStart(2, "0")} às ${String(routine.endHour).padStart(2, "0")}:${String(routine.endMinute).padStart(2, "0")}. Ela já aparece na Agenda.` : "Essa rotina já está registrada na Agenda.";
        await db.insert(chatMessages).values({ userId: ctx.user.id, groupId: activeGroup?.id ?? null, role: "assistant", content: assistantText });
        return { assistant: assistantText, persisted: routineResult.persisted, createdCount: routineResult.createdCount, extraction: { intent: "create", title: routine.title, groupName: routine.groupName, kind: "appointment", plannedAt: routine.occurrences[0] ?? null, durationMinutes: 0, targetText: null, parentTargetText: null, childTaskTitle: null, childTaskNotes: null, notes: "Rotina recorrente", response: assistantText } };
      }
      const context = snapshot.items.filter(item => item.status === "planned").slice(0, 20).map(item => `${item.id}: ${item.title} [${item.kind}] (${formatUserDateTime(item.plannedAt)})`).join("\n");
      const groupContext = activeGroup ? `Você está dentro do grupo “${activeGroup.name}”. Use esse grupo como contexto padrão e crie nele qualquer registro que não indique outro grupo.` : "";
      const systemPrompt = `Você é a Organiza AI, uma assistente pessoal em português do Brasil. Retorne SOMENTE JSON no schema fornecido. Agora é ${formatUserDateTime(now)} no fuso America/Sao_Paulo. ${groupContext} Nunca converta esse horário para UTC ao conversar com a pessoa; use o horário local exibido. Grupos disponíveis: ${snapshot.groups.map(g => g.name).join(", ")}. Itens planejados atuais:\n${context || "nenhum"}. Para criação, use plannedAt em milissegundos UTC; interprete expressões como amanhã, hoje e segunda-feira no fuso local da pessoa. Se não houver data/horário, escolha hoje às 09:00 ou o próximo horário útil e marque que faltam detalhes apenas quando necessário. Diferencie kind task (tarefa executável) de appointment (compromisso/bloco de tempo). Quando a pessoa disser que tem um compromisso e uma entrega/tarefa dentro dele, use o compromisso como title, kind appointment e preencha childTaskTitle e childTaskNotes. Quando a pessoa quiser criar uma tarefa dentro de um compromisso já listado, preencha parentTargetText com parte do título desse compromisso e childTaskTitle com a nova tarefa; a tarefa herdará o horário do compromisso. Para concluir, pular ou reagendar, identifique o item em targetText. O tom configurado para esta pessoa é ${profile?.communicationTone ?? "balanced"}: ${profile?.communicationTone === "gentle" ? "acolhedor, sem pressão" : profile?.communicationTone === "direct" ? "objetivo, com incentivo claro" : "equilibrado e prático"}. Responda com uma frase curta e humana.`;
      const geminiKey = profile?.geminiKeyEncrypted ? decryptUserSecret(profile.geminiKeyEncrypted) : null;
      const response = geminiKey
        ? await invokeGeminiJson(geminiKey, systemPrompt, input.content)
        : await invokeLLM({
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: input.content }],
          response_format: { type: "json_schema", json_schema: { name: "planner_extraction", strict: true, schema: extractionSchema } },
        });
      const extraction = parseExtraction(contentOf(response));
      const normalizedPlannedAt = normalizeRelativeDateHint(input.content, extraction.plannedAt, now);
      const creationExtraction = { ...extraction, plannedAt: normalizedPlannedAt, groupName: activeGroup?.name ?? extraction.groupName };
      let creationPersisted = extraction.intent !== "create";
      const findTarget = () => snapshot.items.find(item => extraction.targetText && item.title.toLowerCase().includes(extraction.targetText.toLowerCase())) ?? snapshot.items.find(item => extraction.title && item.title.toLowerCase().includes(extraction.title.toLowerCase()));
      const findParent = () => snapshot.items.find(item => extraction.parentTargetText && item.title.toLowerCase().includes(extraction.parentTargetText.toLowerCase()) && item.kind === "appointment");
      let persistedCreation: Awaited<ReturnType<typeof persistPlannerCreation>> | null = null;
      const plannedCandidate = normalizedPlannedAt ? { plannedAt: normalizedPlannedAt, durationMinutes: extraction.durationMinutes } : null;
      const conflictItems = snapshot.items.filter(item => {
        if (extraction.kind !== "task" || item.kind !== "appointment") return true;
        const matchesRoutineParent = item.notes === "Rotina recorrente" && normalizedPlannedAt && isSameLocalDay(item.plannedAt, normalizedPlannedAt);
        const matchesExplicitParent = extraction.parentTargetText && item.title.toLowerCase().includes(extraction.parentTargetText.toLowerCase());
        return !matchesRoutineParent && !matchesExplicitParent;
      });
      const conflicts = extraction.intent === "create" && plannedCandidate ? findPlannerConflicts(plannedCandidate, conflictItems) : [];
      if (conflicts.length > 0) {
        const conflictText = `Esse horário já está ocupado por ${conflicts.slice(0, 2).map(item => `“${item.title ?? "um registro existente"}”`).join(" e ")}. Não criei a nova tarefa/compromisso para evitar sobreposição; escolha outro horário ou peça para eu reorganizar.`;
        await db.insert(chatMessages).values({ userId: ctx.user.id, groupId: activeGroup?.id ?? null, submodule: input.submodule ?? null, role: "assistant", content: conflictText });
        return { assistant: conflictText, extraction, persisted: false, conflicts: conflicts.slice(0, 3).map(item => ({ id: item.id, title: item.title, plannedAt: item.plannedAt, durationMinutes: item.durationMinutes })), candidate: creationExtraction };
      }
      if (extraction.intent === "create") {
        const sourceMessageId = Number(userMessage[0].insertId);
        persistedCreation = await persistPlannerCreation({ db, userId: ctx.user.id, snapshot, extraction: creationExtraction, sourceMessageId, submodule: input.submodule ?? null });
        creationPersisted = persistedCreation.persisted;
        if (persistedCreation.item && persistedCreation.plannerItemId && extraction.kind === "appointment") {
            const connection = await getCalendarConnection(ctx.user.id);
            const validToken = connection ? await getValidGoogleAccessToken(connection) : null;
            if (validToken) {
              try {
                if (connection && validToken.expiresAt !== connection.expiresAt) await db.update(calendarConnections).set({ accessTokenEncrypted: encryptUserSecret(validToken.accessToken), expiresAt: validToken.expiresAt }).where(eq(calendarConnections.userId, ctx.user.id));
                const googleEvent = await createGoogleEvent(validToken.accessToken, { title: persistedCreation.item.title, notes: persistedCreation.item.notes, plannedAt: persistedCreation.item.plannedAt, durationMinutes: persistedCreation.item.durationMinutes, calendarId: connection?.calendarId });
                await db.update(plannerItems).set({ googleEventId: googleEvent.id }).where(and(eq(plannerItems.id, persistedCreation.plannerItemId), eq(plannerItems.userId, ctx.user.id)));
              } catch (calendarError) {
                console.warn("[Google Calendar] Could not sync appointment", calendarError);
              }
            }
        }
      }
      const target = findTarget();
      if (target && (extraction.intent === "complete" || extraction.intent === "skip")) await db.update(plannerItems).set({ status: statusForIntent(extraction.intent) }).where(and(eq(plannerItems.id, target.id), eq(plannerItems.userId, ctx.user.id)));
      if (target && extraction.intent === "reschedule") await db.update(plannerItems).set({ status: "planned", plannedAt: nextAvailable(now, snapshot.items, target.durationMinutes) }).where(and(eq(plannerItems.id, target.id), eq(plannerItems.userId, ctx.user.id)));
      const assistantText = creationAssistantResponse(extraction, creationPersisted);
      await db.insert(chatMessages).values({ userId: ctx.user.id, groupId: activeGroup?.id ?? null, submodule: input.submodule ?? null, role: "assistant", content: assistantText });
      return { assistant: assistantText, extraction, persisted: creationPersisted };
    }),
  }),
});

export type AppRouter = typeof appRouter;
