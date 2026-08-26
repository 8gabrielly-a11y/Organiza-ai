import type { Express } from "express";
import { getCalendarConnectionByIcsToken, getPlannerSnapshot } from "./db";
import { buildPlannerIcs } from "./ics";

export function registerIcsRoutes(app: Express) {
  app.get("/api/calendar/ics/:token", async (req, res) => {
    const token = req.params.token;
    if (!token || token.length < 32) {
      res.status(404).end();
      return;
    }
    const connection = await getCalendarConnectionByIcsToken(token);
    if (!connection) {
      res.status(404).end();
      return;
    }
    const snapshot = await getPlannerSnapshot(connection.userId);
    const ics = buildPlannerIcs(snapshot.items);
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(ics);
  });
}
