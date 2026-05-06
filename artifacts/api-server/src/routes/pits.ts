import { Router, type IRouter } from "express";
import { db, pitsTable, appSettingsTable } from "@workspace/db";
import {
  CreatePitBody,
  UpdatePitBody,
  UpdatePitParams,
  GetPitParams,
  DeletePitParams,
  GetNearestPitQueryParams,
  CalculateQuoteBody,
  BulkUpdatePitPricesBody,
  UpdateSettingsBody,
} from "@workspace/api-zod";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

const SETTINGS_ID = "singleton";

const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  massGradeRate: 85,
  regularRate: 95,
  externalMargin: 0.2,
  intercoMargin: 0.15,
  avgSpeedMph: 35,
  loadBufferMinutes: 15,
  updatedBy: "Alex",
};

async function loadSettings() {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.id, SETTINGS_ID));
  if (row) return row;
  const [created] = await db
    .insert(appSettingsTable)
    .values({ ...DEFAULT_SETTINGS, updatedAt: new Date() })
    .returning();
  return created!;
}

function rowToSettings(row: typeof appSettingsTable.$inferSelect) {
  return {
    massGradeRate: row.massGradeRate,
    regularRate: row.regularRate,
    externalMargin: row.externalMargin,
    intercoMargin: row.intercoMargin,
    avgSpeedMph: row.avgSpeedMph,
    loadBufferMinutes: row.loadBufferMinutes,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToPit(row: typeof pitsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    lat: row.lat,
    lng: row.lng,
    materialType: row.materialType,
    pricePerLoad: row.pricePerLoad,
    smithPrice: row.smithPrice ?? null,
    notes: row.notes,
    countyTaxRate: row.countyTaxRate,
    updatedBy: row.updatedBy,
    updatedAt: row.updatedAt.toISOString(),
  };
}

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

router.get("/pits", async (_req, res) => {
  const rows = await db.select().from(pitsTable);
  res.json(rows.map(rowToPit));
});

router.get("/pits/nearest", async (req, res) => {
  const { lat, lng } = GetNearestPitQueryParams.parse({
    lat: Number(req.query.lat),
    lng: Number(req.query.lng),
  });
  const rows = await db.select().from(pitsTable);
  if (rows.length === 0) {
    res.status(404).json({ message: "No pits available" });
    return;
  }
  const settings = await loadSettings();
  let bestRow = rows[0]!;
  let bestDist = haversineMiles(lat, lng, bestRow.lat, bestRow.lng);
  for (const r of rows.slice(1)) {
    const d = haversineMiles(lat, lng, r.lat, r.lng);
    if (d < bestDist) {
      bestDist = d;
      bestRow = r;
    }
  }
  const oneWayMin = (bestDist / settings.avgSpeedMph) * 60;
  res.json({
    pit: rowToPit(bestRow),
    distanceMiles: Number(bestDist.toFixed(2)),
    estimatedOneWayMinutes: Number(oneWayMin.toFixed(1)),
  });
});

router.patch("/pits/bulk", async (req, res) => {
  const body = BulkUpdatePitPricesBody.parse(req.body);
  const ids = body.updates.map((u) => u.id);
  const existing = await db.select().from(pitsTable).where(inArray(pitsTable.id, ids));
  const existingIds = new Set(existing.map((r) => r.id));
  const missing = ids.filter((id) => !existingIds.has(id));
  if (missing.length > 0) {
    res.status(404).json({ message: "Some pits not found", ids: missing });
    return;
  }
  const now = new Date();
  const updated: typeof pitsTable.$inferSelect[] = [];
  for (const u of body.updates) {
    const [row] = await db
      .update(pitsTable)
      .set({
        pricePerLoad: u.pricePerLoad,
        countyTaxRate: u.countyTaxRate,
        updatedBy: body.updatedBy,
        updatedAt: now,
      })
      .where(eq(pitsTable.id, u.id))
      .returning();
    if (row) updated.push(row);
  }
  res.json(updated.map(rowToPit));
});

router.post("/pits", async (req, res) => {
  const body = CreatePitBody.parse(req.body);
  const [row] = await db
    .insert(pitsTable)
    .values({
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state.toUpperCase(),
      lat: body.lat,
      lng: body.lng,
      materialType: body.materialType,
      pricePerLoad: body.pricePerLoad,
      smithPrice: body.smithPrice ?? null,
      notes: body.notes ?? null,
      countyTaxRate: body.countyTaxRate,
      updatedBy: body.updatedBy,
      updatedAt: new Date(),
    })
    .returning();
  res.status(201).json(rowToPit(row!));
});

router.get("/pits/:id", async (req, res) => {
  const { id } = GetPitParams.parse(req.params);
  const [row] = await db.select().from(pitsTable).where(eq(pitsTable.id, id));
  if (!row) {
    res.status(404).json({ message: "Pit not found" });
    return;
  }
  res.json(rowToPit(row));
});

router.patch("/pits/:id", async (req, res) => {
  const { id } = UpdatePitParams.parse(req.params);
  const body = UpdatePitBody.parse(req.body);
  const [row] = await db
    .update(pitsTable)
    .set({
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state.toUpperCase(),
      lat: body.lat,
      lng: body.lng,
      materialType: body.materialType,
      pricePerLoad: body.pricePerLoad,
      smithPrice: body.smithPrice ?? null,
      notes: body.notes ?? null,
      countyTaxRate: body.countyTaxRate,
      updatedBy: body.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(pitsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ message: "Pit not found" });
    return;
  }
  res.json(rowToPit(row));
});

router.delete("/pits/:id", async (req, res) => {
  const { id } = DeletePitParams.parse(req.params);
  await db.delete(pitsTable).where(eq(pitsTable.id, id));
  res.status(204).end();
});

router.post("/quote/calculate", async (req, res) => {
  const body = CalculateQuoteBody.parse(req.body);
  const [pit] = await db.select().from(pitsTable).where(eq(pitsTable.id, body.pitId));
  if (!pit) {
    res.status(404).json({ message: "Pit not found" });
    return;
  }
  const settings = await loadSettings();

  const avgSpeed = body.avgSpeedMph ?? settings.avgSpeedMph;
  const loadBuffer = body.loadBufferMinutes ?? settings.loadBufferMinutes;

  const haversineDistance = haversineMiles(pit.lat, pit.lng, body.destLat, body.destLng);
  let distance: number;
  let oneWayMin: number;
  let distanceSource: "routes_api" | "haversine";

  if (body.driveTimeMinutes !== undefined && body.driveTimeMinutes !== null) {
    oneWayMin = body.driveTimeMinutes;
    distance = body.driveDistanceMiles ?? haversineDistance;
    distanceSource = "routes_api";
  } else {
    distance = haversineDistance;
    oneWayMin = (distance / avgSpeed) * 60;
    distanceSource = "haversine";
  }

  const roundTripMin = oneWayMin * 2;
  const totalMinutesPerLoad = roundTripMin + loadBuffer;

  const hourlyRate =
    body.hourlyRateType === "mass_grade" ? settings.massGradeRate : settings.regularRate;
  const marginPercent =
    body.marginType === "external" ? settings.externalMargin : settings.intercoMargin;

  const truckingPerLoad = (totalMinutesPerLoad / 60) * hourlyRate;
  const truckingWithMargin = truckingPerLoad * (1 + marginPercent);

  const marketPricePerLoad = pit.pricePerLoad;
  const priceWasOverridden =
    body.overridePricePerLoad !== undefined && body.overridePricePerLoad !== null;
  const materialPerLoad = priceWasOverridden ? body.overridePricePerLoad! : marketPricePerLoad;

  const subtotalPerLoad = truckingWithMargin + materialPerLoad;
  const taxPerLoad = subtotalPerLoad * pit.countyTaxRate;
  const totalPerLoad = subtotalPerLoad + taxPerLoad;
  const grandTotal = totalPerLoad * body.loads;

  const round2 = (n: number) => Number(n.toFixed(2));

  res.json({
    pit: rowToPit(pit),
    distanceMiles: round2(distance),
    oneWayMinutes: round2(oneWayMin),
    roundTripMinutes: round2(roundTripMin),
    loadBufferMinutes: loadBuffer,
    totalMinutesPerLoad: round2(totalMinutesPerLoad),
    hourlyRate,
    marginPercent,
    countyTaxRate: pit.countyTaxRate,
    truckingPerLoad: round2(truckingPerLoad),
    truckingWithMarginPerLoad: round2(truckingWithMargin),
    materialPerLoad: round2(materialPerLoad),
    subtotalPerLoad: round2(subtotalPerLoad),
    taxPerLoad: round2(taxPerLoad),
    totalPerLoad: round2(totalPerLoad),
    loads: body.loads,
    grandTotal: round2(grandTotal),
    distanceSource,
    priceWasOverridden,
    marketPricePerLoad: round2(marketPricePerLoad),
  });
});

router.get("/settings", async (_req, res) => {
  const settings = await loadSettings();
  res.json(rowToSettings(settings));
});

router.put("/settings", async (req, res) => {
  const body = UpdateSettingsBody.parse(req.body);
  await loadSettings();
  const [row] = await db
    .update(appSettingsTable)
    .set({
      massGradeRate: body.massGradeRate,
      regularRate: body.regularRate,
      externalMargin: body.externalMargin,
      intercoMargin: body.intercoMargin,
      avgSpeedMph: body.avgSpeedMph,
      loadBufferMinutes: body.loadBufferMinutes,
      updatedBy: body.updatedBy,
      updatedAt: new Date(),
    })
    .where(eq(appSettingsTable.id, SETTINGS_ID))
    .returning();
  res.json(rowToSettings(row!));
});

router.get("/users", (_req, res) => {
  res.json(["Alex", "Justin"]);
});

export default router;
