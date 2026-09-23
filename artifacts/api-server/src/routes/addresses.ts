import { Router, type IRouter } from "express";
import { SearchAddressesQueryParams, SearchAddressesResponse } from "@workspace/api-zod";
import { ProviderError } from "../lib/cache";
import { geocodeAddress } from "../lib/navitime";

const router: IRouter = Router();

router.get("/addresses/search", async (req, res) => {
  const parsed = SearchAddressesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
    return;
  }
  try {
    res.json(SearchAddressesResponse.parse(await geocodeAddress(parsed.data.q)));
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err;
    req.log.warn({ err: err.message }, "Address provider unavailable");
    res.status(502).json({ error: "Address provider unavailable" });
  }
});

export default router;
