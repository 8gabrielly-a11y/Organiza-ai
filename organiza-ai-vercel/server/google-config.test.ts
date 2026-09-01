import { describe, expect, it } from "vitest";

const hasRealGoogleConfig = Boolean(process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.startsWith("test."));

describe.skipIf(!hasRealGoogleConfig)("Google Calendar OAuth configuration", () => {
  it("validates the configured OAuth client without exposing its secret", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    expect(clientId).toBeTruthy();
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(clientSecret).toBeTruthy();
    expect(clientSecret).not.toMatch(/\s/);
    expect(redirectUri).toMatch(/^https:\/\//);

    const body = new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      grant_type: "authorization_code",
      code: "organiza-ai-configuration-check",
      redirect_uri: redirectUri!,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const payload = (await response.json()) as { error?: string };
    expect(response.ok).toBe(false);
    expect(payload.error).not.toBe("invalid_client");
  }, 15_000);
});
