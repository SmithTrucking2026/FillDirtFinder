import { Router, type IRouter } from "express";
import { z } from "zod";

const router: IRouter = Router();

const DriveTimeInputSchema = z.object({
  originLat: z.number(),
  originLng: z.number(),
  destLat: z.number(),
  destLng: z.number(),
});

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

router.post("/drive-time", async (req, res) => {
  const body = DriveTimeInputSchema.parse(req.body);
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    req.log.warn("VITE_GOOGLE_MAPS_API_KEY not set — using haversine fallback");
    const distMiles = haversineMiles(body.originLat, body.originLng, body.destLat, body.destLng);
    res.json({
      driveTimeMinutes: Number(((distMiles / 35) * 60).toFixed(1)),
      driveDistanceMiles: Number(distMiles.toFixed(2)),
      source: "haversine_fallback",
    });
    return;
  }

  try {
    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: body.originLat, longitude: body.originLng },
            },
          },
          destination: {
            location: {
              latLng: { latitude: body.destLat, longitude: body.destLng },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      req.log.error({ status: response.status, body: errText }, "Routes API error");
      res.status(502).json({ message: "Routes API error", detail: errText });
      return;
    }

    const data = (await response.json()) as {
      routes?: Array<{ duration?: string; distanceMeters?: number }>;
    };

    const route = data.routes?.[0];
    if (!route) {
      req.log.warn({ data }, "Routes API returned no routes — falling back to haversine");
      const distMiles = haversineMiles(body.originLat, body.originLng, body.destLat, body.destLng);
      res.json({
        driveTimeMinutes: Number(((distMiles / 35) * 60).toFixed(1)),
        driveDistanceMiles: Number(distMiles.toFixed(2)),
        source: "haversine_fallback",
      });
      return;
    }

    // duration is returned as e.g. "1234s"
    const durationSeconds = route.duration ? parseInt(route.duration.replace("s", ""), 10) : 0;
    const distanceMeters = route.distanceMeters ?? 0;

    res.json({
      driveTimeMinutes: Number((durationSeconds / 60).toFixed(1)),
      driveDistanceMiles: Number((distanceMeters / 1609.344).toFixed(2)),
      source: "routes_api",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to call Routes API — falling back to haversine");
    const distMiles = haversineMiles(body.originLat, body.originLng, body.destLat, body.destLng);
    res.json({
      driveTimeMinutes: Number(((distMiles / 35) * 60).toFixed(1)),
      driveDistanceMiles: Number(distMiles.toFixed(2)),
      source: "haversine_fallback",
    });
  }
});

export default router;
