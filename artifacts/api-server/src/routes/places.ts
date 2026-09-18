import { Router, type IRouter } from "express";
import { GetNearbyPlacesQueryParams, GetNearbyPlacesResponse } from "@workspace/api-zod";
import { ProviderError } from "../lib/cache";
import { nearbyPlaces } from "../lib/navitime";

const router: IRouter = Router();

router.get("/places/nearby", async (req, res) => {
  const parsed = GetNearbyPlacesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
    return;
  }
  try {
    res.json(GetNearbyPlacesResponse.parse(await nearbyPlaces(parsed.data.lat, parsed.data.lon)));
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err;
    req.log.warn({ err: err.message }, "Place provider unavailable");
    res.status(502).json({ error: "Place provider unavailable" });
  }
});

export default router;
