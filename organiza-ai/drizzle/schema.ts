import { bigint, boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  onboardingComplete: int("onboardingComplete").notNull().default(0),
  communicationTone: mysqlEnum("communicationTone", ["gentle", "balanced", "direct"]).notNull().default("balanced"),
  preferredName: varchar("preferredName", { length: 120 }),
  email: varchar("email", { length: 320 }),
  geminiKeyEncrypted: text("geminiKeyEncrypted"),
  reminderScheduleUid: varchar("reminderScheduleUid", { length: 96 }),
  reminderChannel: mysqlEnum("reminderChannel", ["chat", "email"]).notNull().default("chat"),
  reminderLeadMinutes: int("reminderLeadMinutes").notNull().default(30),
  quietHoursStartMinute: int("quietHoursStartMinute").notNull().default(1320),
  quietHoursEndMinute: int("quietHoursEndMinute").notNull().default(420),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const plannerGroups = mysqlTable("planner_groups", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  color: varchar("color", { length: 24 }).notNull().default("sage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const plannerSubmodules = mysqlTable("planner_submodules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const plannerItems = mysqlTable("planner_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  notes: text("notes"),
  kind: mysqlEnum("kind", ["task", "appointment", "update"]).notNull().default("task"),
  status: mysqlEnum("status", ["planned", "completed", "skipped"]).notNull().default("planned"),
  plannedAt: bigint("plannedAt", { mode: "number" }).notNull(),
  durationMinutes: int("durationMinutes").notNull().default(30),
  sourceMessageId: int("sourceMessageId"),
  googleEventId: varchar("googleEventId", { length: 320 }),
  parentItemId: int("parentItemId"),
  submodule: varchar("submodule", { length: 120 }),
  detailsNeeded: boolean("detailsNeeded").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const plannerRoutines = mysqlTable("planner_routines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  groupId: int("groupId"),
  title: varchar("title", { length: 220 }).notNull(),
  daysOfWeek: varchar("daysOfWeek", { length: 32 }).notNull(),
  startMinute: int("startMinute").notNull(),
  endMinute: int("endMinute").notNull(),
  commuteBeforeMinutes: int("commuteBeforeMinutes").notNull().default(0),
  commuteAfterMinutes: int("commuteAfterMinutes").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const plannerRoutineExceptions = mysqlTable("planner_routine_exceptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  routineId: int("routineId").notNull(),
  dateKey: varchar("dateKey", { length: 10 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  groupId: int("groupId"),
  submodule: varchar("submodule", { length: 120 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userFeedback = mysqlTable("user_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["suggestion", "problem", "compliment", "other"]).notNull().default("suggestion"),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read"]).notNull().default("new"),
  adminResponse: text("adminResponse"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const plannerNotifications = mysqlTable("planner_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plannerItemId: int("plannerItemId"),
  kind: varchar("kind", { length: 48 }).notNull(),
  dedupeKey: varchar("dedupeKey", { length: 180 }).notNull().unique(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const calendarConnections = mysqlTable("calendar_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  provider: varchar("provider", { length: 32 }).notNull().default("google"),
  accessTokenEncrypted: text("accessTokenEncrypted"),
  refreshTokenEncrypted: text("refreshTokenEncrypted"),
  expiresAt: bigint("expiresAt", { mode: "number" }),
  calendarId: varchar("calendarId", { length: 320 }).default("primary"),
  icsToken: varchar("icsToken", { length: 96 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type PlannerGroup = typeof plannerGroups.$inferSelect;
export type PlannerSubmodule = typeof plannerSubmodules.$inferSelect;
export type PlannerItem = typeof plannerItems.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type PlannerRoutine = typeof plannerRoutines.$inferSelect;
export type PlannerNotification = typeof plannerNotifications.$inferSelect;
export type UserFeedback = typeof userFeedback.$inferSelect;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
