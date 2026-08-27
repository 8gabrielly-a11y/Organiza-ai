import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import app from "./index";

const servers: Server[] = [];

async function startTestServer() {
  const server = createServer(app);
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
  it("responds with JSON from the health endpoint with and without the api prefix", async () => {
    const { baseUrl } = await startTestServer();

    for (const path of ["/api/health", "/health"]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ ok: true, service: "organiza-ai" });
    }
  });

  it("keeps tRPC validation errors as JSON instead of an empty response", async () => {
    const { baseUrl } = await startTestServer();
    const response = await fetch(`${baseUrl}/trpc/auth.register?batch=1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ 0: { json: { name: "Bia", email: "invalid@example.com", password: "curta" } } }),
    });

    const payload = await response.json() as Array<{ error?: { json?: { message?: string; data?: { code?: string } } } }>;
    expect(response.status).toBe(400);
    expect(payload[0]?.error?.json?.data?.code).toBe("BAD_REQUEST");
    expect(payload[0]?.error?.json?.message).toContain("password");
  });
});
