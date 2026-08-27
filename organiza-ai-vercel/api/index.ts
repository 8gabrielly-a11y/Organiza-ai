import express from "express";
import type { HttpNext, HttpRequest, HttpResponse } from "../server/_core/httpTypes";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { registerGoogleCalendarRoutes } from "../server/googleCalendarRoutes";
import { registerIcsRoutes } from "../server/icsRoutes";
import { registerReminderRoutes } from "../server/reminderRoutes";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

// Depending on the Vercel routing mode, a catch-all function can receive the
// path with or without the `/api` prefix. Normalize it before route matching so
// tRPC, OAuth and calendar endpoints behave identically in both cases.
app.use((req: HttpRequest, _res: HttpResponse, next: HttpNext) => {
  if (!req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
registerGoogleCalendarRoutes(app);
registerIcsRoutes(app);
registerReminderRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/api/health", (_req: HttpRequest, res: HttpResponse) => {
  res.status(200).json({ ok: true, service: "organiza-ai" });
});

app.use((req: HttpRequest, res: HttpResponse) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

app.use((error: unknown, _req: HttpRequest, res: HttpResponse, next: HttpNext) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  console.error("[Vercel API] Unhandled request error", error);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
