import { describe, expect, it } from "vitest";

describe("Resend configuration", () => {
  it("accepts the configured API key", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return;
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${apiKey}` } });
    expect([401, 403], `Resend rejected the configured API key with HTTP ${response.status}`).not.toContain(response.status);
  }, 15000);
});
