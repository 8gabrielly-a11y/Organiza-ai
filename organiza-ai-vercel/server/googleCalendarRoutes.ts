import type { Express, Request, Response } from "express";
import { exchangeGoogleCode, connectionTokens, readOAuthState } from "./googleCalendar";
import { saveCalendarConnection } from "./db";

export function registerGoogleCalendarRoutes(app: Express) {
  app.get("/api/calendar/google/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const error = typeof req.query.error === "string" ? req.query.error : null;
    if (error || !code || !state) {
      res.redirect("/settings?calendar=error");
      return;
    }
    try {
      const userId = readOAuthState(state);
      const tokens = await exchangeGoogleCode(code);
      await saveCalendarConnection(userId, connectionTokens(tokens.access_token!, tokens.refresh_token ?? null, tokens.expires_in));
      res.redirect("/settings?calendar=connected");
    } catch (callbackError) {
      console.error("[Google Calendar] OAuth callback failed", callbackError);
      res.redirect("/settings?calendar=error");
    }
  });
}
