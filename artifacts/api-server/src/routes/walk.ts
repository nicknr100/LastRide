import { Router, type IRouter } from "express";
import { GetWalkRouteQueryParams, GetWalkRouteResponse } from "@workspace/api-zod";
import { ProviderError } from "../lib/cache";
import { walkRoute } from "../lib/navitime";

const router: IRouter = Router();

router.get("/walk", async (req, res) => {
  const parsed = GetWalkRouteQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
    return;
  }
  const { fromLat, fromLon, toLat, toLon, pace } = parsed.data;
  try {
    const route = await walkRoute({ latitude: fromLat, longitude: fromLon }, { latitude: toLat, longitude: toLon }, pace);
    if (!route) {
      res.status(404).json({ error: "No walking route" });
      return;
    }
    res.json(GetWalkRouteResponse.parse(route));
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err;
    req.log.warn({ err: err.message }, "Routing provider unavailable");
    res.status(502).json({ error: "Routing provider unavailable" });
  }
});

export default router;
