import { Router, type IRouter } from "express";
import { GetTaxiEstimateQueryParams, GetTaxiEstimateResponse } from "@workspace/api-zod";
import { ProviderError } from "../lib/cache";
import { taxiEstimate } from "../lib/navitime";

const router: IRouter = Router();

router.get("/taxi", async (req, res) => {
  const parsed = GetTaxiEstimateQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
    return;
  }
  const { fromLat, fromLon, toLat, toLon, startTime } = parsed.data;
  try {
    const estimate = await taxiEstimate({ latitude: fromLat, longitude: fromLon }, { latitude: toLat, longitude: toLon }, startTime);
    if (!estimate) {
      res.status(404).json({ error: "No driving route" });
      return;
    }
    res.json(GetTaxiEstimateResponse.parse(estimate));
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err;
    req.log.warn({ err: err.message }, "Routing provider unavailable");
    res.status(502).json({ error: "Routing provider unavailable" });
  }
});

export default router;
