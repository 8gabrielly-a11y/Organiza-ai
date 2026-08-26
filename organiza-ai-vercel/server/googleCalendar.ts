import crypto from "node:crypto";
import { ENV } from "./_core/env";
import { decryptUserSecret, encryptUserSecret } from "./profile";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function googleTitleForStatus(title: string, status: "completed" | "skipped") {
  return status === "completed" ? `✓ ${title}` : title;
}

function requireConfig() {
  if (!ENV.googleClientId || !ENV.googleClientSecret || !ENV.googleRedirectUri) {
    throw new Error("Google Calendar ainda não está configurado no servidor.");
  }
}

export function createOAuthState(userId: number) {
  const payload = `${userId}.${Date.now()}`;
  const signature = crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function readOAuthState(state: string) {
  const [userIdText, issuedAtText, signature] = state.split(".");
  const payload = `${userIdText}.${issuedAtText}`;
  const expected = crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest("hex");
  if (!signature || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Estado OAuth inválido");
  const userId = Number(userIdText);
  const issuedAt = Number(issuedAtText);
  if (!Number.isInteger(userId) || !Number.isFinite(issuedAt) || Date.now() - issuedAt > 10 * 60 * 1000) throw new Error("Estado OAuth expirado");
  return userId;
}

export function googleAuthorizationUrl(userId: number) {
  requireConfig();
  const query = new URLSearchParams({
    client_id: ENV.googleClientId,
    redirect_uri: ENV.googleRedirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: CALENDAR_SCOPE,
    state: createOAuthState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${query.toString()}`;
}

async function tokenRequest(params: URLSearchParams) {
  requireConfig();
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: params });
  const payload = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error ?? "Falha ao obter token do Google");
  return payload;
}

export async function exchangeGoogleCode(code: string) {
  return tokenRequest(new URLSearchParams({ code, client_id: ENV.googleClientId, client_secret: ENV.googleClientSecret, redirect_uri: ENV.googleRedirectUri, grant_type: "authorization_code" }));
}

export async function refreshGoogleToken(refreshTokenEncrypted: string) {
  const refreshToken = decryptUserSecret(refreshTokenEncrypted);
  if (!refreshToken) throw new Error("Token de renovação do Google inválido.");
  return tokenRequest(new URLSearchParams({ client_id: ENV.googleClientId, client_secret: ENV.googleClientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }));
}

export async function getValidGoogleAccessToken(connection: { accessTokenEncrypted: string | null; refreshTokenEncrypted: string | null; expiresAt: number | null }) {
  const current = connection.accessTokenEncrypted ? decryptUserSecret(connection.accessTokenEncrypted) : null;
  if (current && (!connection.expiresAt || connection.expiresAt > Date.now() + 60_000)) return { accessToken: current, expiresAt: connection.expiresAt };
  if (!connection.refreshTokenEncrypted) return null;
  const refreshed = await refreshGoogleToken(connection.refreshTokenEncrypted);
  return { accessToken: refreshed.access_token!, expiresAt: Date.now() + (refreshed.expires_in ?? 3600) * 1000 };
}

export function connectionTokens(accessToken: string, refreshToken: string | null, expiresIn: number | undefined) {
  return { accessTokenEncrypted: encryptUserSecret(accessToken), refreshTokenEncrypted: refreshToken ? encryptUserSecret(refreshToken) : null, expiresAt: Date.now() + (expiresIn ?? 3600) * 1000 };
}

export async function updateGoogleEvent(accessToken: string, eventId: string, event: { title: string; notes?: string | null; plannedAt: number; durationMinutes: number; calendarId?: string | null }) {
  const start = new Date(event.plannedAt);
  const end = new Date(event.plannedAt + event.durationMinutes * 60_000);
  const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodeURIComponent(event.calendarId ?? "primary")}/events/${encodeURIComponent(eventId)}`, { method: "PATCH", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ summary: event.title, description: event.notes ?? undefined, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } }) });
  if (!response.ok) throw new Error("Não foi possível atualizar o evento no Google Calendar.");
}

export async function cancelGoogleEvent(accessToken: string, eventId: string, calendarId?: string | null) {
  const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodeURIComponent(calendarId ?? "primary")}/events/${encodeURIComponent(eventId)}`, { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } });
  if (!response.ok && response.status !== 410) throw new Error("Não foi possível cancelar o evento no Google Calendar.");
}

export async function createGoogleEvent(accessToken: string, event: { title: string; notes?: string | null; plannedAt: number; durationMinutes: number; calendarId?: string | null }) {
  const start = new Date(event.plannedAt);
  const end = new Date(event.plannedAt + event.durationMinutes * 60_000);
  const response = await fetch(`${CALENDAR_API_URL}/calendars/${encodeURIComponent(event.calendarId ?? "primary")}/events`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ summary: event.title, description: event.notes ?? undefined, start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() } }),
  });
  if (!response.ok) throw new Error("Não foi possível criar o evento no Google Calendar.");
  return response.json() as Promise<{ id: string; htmlLink?: string }>;
}
