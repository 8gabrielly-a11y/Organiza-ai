import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithJsonGuard } from "./fetchGuard";

describe("fetchWithJsonGuard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns JSON responses unchanged", async () => {
    const response = new Response(JSON.stringify([{ result: { data: { json: { ok: true } } } }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchWithJsonGuard("/api/trpc/auth.me")).resolves.toBe(response);
  });

  it("explains when Vercel returns HTML instead of JSON", async () => {
    const response = new Response("The page could not be found", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchWithJsonGuard("/api/trpc/auth.login")).rejects.toThrow(
      "A API não retornou JSON (HTTP 404). Verifique o deployment do Vercel",
    );
  });
});
