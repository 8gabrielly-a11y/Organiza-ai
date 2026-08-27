import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import handler, { app } from "./index";

const servers: Server[] = [];

async function startTestServer(requestHandler = app) {
  const server = createServer(requestHandler as never);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Servidor de teste não abriu uma porta");
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => {
        if (!server.listening) return resolve();
        server.close(() => resolve());
      })
    )
  );
});

describe("Vercel Express adapter", () => {
  it("invokes the explicit Node handler and responds with JSON", async () => {
    const { baseUrl } = await startTestServer(handler);
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, service: "organiza-ai" });
  });

  it("responds with JSON from the health endpoint with and without the api prefix", async () => {
    const { baseUrl } = await startTestServer();

    for (const path of ["/api/health", "/health"]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true, service: "organiza-ai" });
    }
  });

  it("returns a JSON 404 from the root fallback instead of HTML", async () => {
    const { baseUrl } = await startTestServer();
    const response = await fetch(`${baseUrl}/`);

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Not found", path: "/api/" });
  });

  it("keeps tRPC validation errors as JSON instead of an empty response", async () => {
    const { baseUrl } = await startTestServer();
    for (const path of ["/trpc/auth.register?batch=1", "/api/trpc/auth.register?batch=1"]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 0: { json: { name: "Bia", email: "invalid@example.com", password: "curta" } } }),
      });

      const payload = await response.json() as Array<{ error?: { json?: { message?: string; data?: { code?: string } } } }>;
      expect(response.status).toBe(400);
      expect(payload[0]?.error?.json?.data?.code).toBe("BAD_REQUEST");
      expect(payload[0]?.error?.json?.message).toContain("password");
    }
  });
});
