/**
 * Seed Smith Trucking Company pits into the local Postgres database.
 *
 * Source: filldirtmap.com/dirt-sources (authoritative as of May 2026)
 *
 * Run from the workspace root:
 *   pnpm --filter @workspace/scripts run seed-pits
 *
 * Pass --force to wipe and reseed existing pits:
 *   pnpm --filter @workspace/scripts run seed-pits -- --force
 *
 * PRICING COLUMNS:
 *   pricePerLoad  = Retail Price (what Smith quotes customers for material)
 *   smithPrice    = Smith Internal Price (STC transfer price — used by inner-dirt toggle)
 *
 * For STC pits:   smithPrice ≈ pricePerLoad × (5/6) — 20% below retail
 * For Competitor: smithPrice = pricePerLoad (Smith pays full retail, no discount)
 *
 * GPS COORDINATES: Converted from DMS to decimal degrees. Source: filldirtmap.com.
 */

import { db, pitsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

type SeedPit = {
  name: string;
  operator: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  materialType: "fill_dirt" | "topsoil" | "sand" | "rock" | "gravel" | "mixed";
  pricePerLoad: number;
  smithPrice: number;
  countyTaxRate: number;
  pitType: "Smith Trucking" | "Competitor";
  notes: string | null;
};

// County tax rates (FL)
const TAX_ST_JOHNS = 0.065;
const TAX_DUVAL = 0.075;
const TAX_CLAY = 0.075;
const TAX_NASSAU = 0.07;
const TAX_FLAGLER = 0.07;

/**
 * DMS → decimal:  d + m/60 + s/3600  (negative for W/S)
 * All coordinates verified from filldirtmap.com source data.
 */
const SEED_PITS: SeedPit[] = [
  // ─────────────────────────────────────────────────────────────
  // SMITH TRUCKING PITS
  // Retail = customer price; Smith = internal transfer (~83.33% of retail)
  // ─────────────────────────────────────────────────────────────
  {
    name: "St Marks",
    operator: "Smith Trucking Company",
    address: "St Marks Pit",
    city: "Saint Augustine",
    state: "FL",
    lat: 29.982556,   // 29°58'57.2"N
    lng: -81.381806,  // 81°22'54.5"W
    materialType: "fill_dirt",
    pricePerLoad: 100.00,
    smithPrice: 83.33,
    countyTaxRate: TAX_ST_JOHNS,
    pitType: "Smith Trucking",
    notes: null,
  },
  {
    name: "16a",
    operator: "Smith Trucking Company",
    address: "CR 16A",
    city: "Saint Augustine",
    state: "FL",
    lat: 30.014722,   // 30°0'53.0"N
    lng: -81.585111,  // 81°35'6.4"W
    materialType: "fill_dirt",
    pricePerLoad: 160.00,
    smithPrice: 133.33,
    countyTaxRate: TAX_ST_JOHNS,
    pitType: "Smith Trucking",
    notes: null,
  },
  {
    name: "Trout Creek",
    operator: "Smith Trucking Company",
    address: "Trout Creek Pit",
    city: "Saint Augustine",
    state: "FL",
    lat: 29.981722,   // 29°58'54.2"N
    lng: -81.558417,  // 81°33'30.3"W
    materialType: "fill_dirt",
    pricePerLoad: 160.00,
    smithPrice: 133.33,
    countyTaxRate: TAX_ST_JOHNS,
    pitType: "Smith Trucking",
    notes: null,
  },
  {
    name: "CR 305",
    operator: "Smith Trucking Company",
    address: "CR 305",
    city: "Hastings",
    state: "FL",
    lat: 29.772056,   // 29°46'19.4"N
    lng: -81.424917,  // 81°25'29.7"W
    materialType: "fill_dirt",
    pricePerLoad: 100.00,
    smithPrice: 83.33,
    countyTaxRate: TAX_ST_JOHNS,
    pitType: "Smith Trucking",
    notes: null,
  },
  {
    name: "Spurlin",
    operator: "Smith Trucking Company",
    address: "Spurlin Pit",
    city: "Green Cove Springs",
    state: "FL",
    lat: 29.970611,   // 29°58'14.2"N
    lng: -81.770389,  // 81°46'13.4"W
    materialType: "fill_dirt",
    pricePerLoad: 100.00,
    smithPrice: 83.33,
    countyTaxRate: TAX_CLAY,
    pitType: "Smith Trucking",
    notes: null,
  },
  {
    name: "Diamond Timbers",
    operator: "Smith Trucking Company",
    address: "Diamond Timbers Pit",
    city: "Bryceville",
    state: "FL",
    lat: 30.194611,   // 30°11'40.6"N
    lng: -81.957278,  // 81°57'26.2"W
    materialType: "fill_dirt",
    pricePerLoad: 100.00,
    smithPrice: 83.33,
    countyTaxRate: TAX_NASSAU,
    pitType: "Smith Trucking",
    notes: null,
  },
  {
    name: "JIP",
    operator: "Smith Trucking Company",
    address: "JIP Pit",
    city: "Green Cove Springs",
    state: "FL",
    lat: 29.903750,   // 29°54'13.5"N
    lng: -81.861472,  // 81°51'41.3"W
    materialType: "fill_dirt",
    pricePerLoad: 160.00,
    smithPrice: 133.33,
    countyTaxRate: TAX_CLAY,
    pitType: "Smith Trucking",
    notes: null,
  },
  // ─────────────────────────────────────────────────────────────
  // COMPETITOR PITS
  // Smith pays full retail; competitor haulers get ~83.33% of retail
  // ─────────────────────────────────────────────────────────────
  {
    name: "Plummer",
    operator: "Shaw's Land Clearing",
    address: "Plummer Rd",
    city: "Callahan",
    state: "FL",
    lat: 30.431750,   // 30°25'54.3"N
    lng: -81.810028,  // 81°48'36.1"W
    materialType: "fill_dirt",
    pricePerLoad: 100.00,
    smithPrice: 100.00,
    countyTaxRate: TAX_NASSAU,
    pitType: "Competitor",
    notes: "Operator: Shaw's Land Clearing",
  },
  {
    name: "Sharron Rd",
    operator: "Vallencourt Construction",
    address: "Sharron Rd",
    city: "Green Cove Springs",
    state: "FL",
    lat: 29.904139,   // 29°54'14.9"N
    lng: -81.861139,  // 81°51'40.1"W
    materialType: "fill_dirt",
    pricePerLoad: 50.00,
    smithPrice: 50.00,
    countyTaxRate: TAX_CLAY,
    pitType: "Competitor",
    notes: "Operator: Vallencourt Construction",
  },
  {
    name: "CR 208",
    operator: "VJ Usina",
    address: "CR 208",
    city: "Saint Augustine",
    state: "FL",
    lat: 29.908250,   // 29°54'29.7"N
    lng: -81.466194,  // 81°27'58.3"W
    materialType: "fill_dirt",
    pricePerLoad: 95.00,
    smithPrice: 95.00,
    countyTaxRate: TAX_ST_JOHNS,
    pitType: "Competitor",
    notes: "Operator: VJ Usina",
  },
  {
    name: "Pages Dairy",
    operator: "JB Coxwell",
    address: "Pages Dairy Rd",
    city: "Fernandina Beach",
    state: "FL",
    lat: 30.652556,   // 30°39'9.2"N
    lng: -81.597556,  // 81°35'51.2"W
    materialType: "fill_dirt",
    pricePerLoad: 110.00,
    smithPrice: 110.00,
    countyTaxRate: TAX_NASSAU,
    pitType: "Competitor",
    notes: "Operator: JB Coxwell",
  },
  {
    name: "Crawford Rd",
    operator: "Ed Hodzic",
    address: "Crawford Rd",
    city: "Callahan",
    state: "FL",
    lat: 30.516806,   // 30°31'0.5"N
    lng: -81.933944,  // 81°56'2.2"W
    materialType: "fill_dirt",
    pricePerLoad: 85.00,
    smithPrice: 85.00,
    countyTaxRate: TAX_NASSAU,
    pitType: "Competitor",
    notes: "Operator: Ed Hodzic",
  },
  {
    name: "Sims CR204",
    operator: "Sims Trucking",
    address: "CR 204",
    city: "Interlachen",
    state: "FL",
    lat: 29.667750,   // 29°40'3.9"N
    lng: -81.324778,  // 81°19'29.2"W
    materialType: "fill_dirt",
    pricePerLoad: 85.00,
    smithPrice: 85.00,
    countyTaxRate: TAX_FLAGLER,
    pitType: "Competitor",
    notes: "Operator: Sims Trucking",
  },
  {
    name: "Sims CR205",
    operator: "Sims Trucking",
    address: "CR 205",
    city: "Bunnell",
    state: "FL",
    lat: 29.504000,   // 29°30'14.4"N
    lng: -81.327389,  // 81°19'38.6"W
    materialType: "fill_dirt",
    pricePerLoad: 85.00,
    smithPrice: 85.00,
    countyTaxRate: TAX_FLAGLER,
    pitType: "Competitor",
    notes: "Operator: Sims Trucking",
  },
  {
    name: "A Morea Pit",
    operator: "A Morea Enterprises",
    address: "A Morea Pit",
    city: "Palatka",
    state: "FL",
    lat: 29.448972,   // 29°26'56.3"N
    lng: -81.163611,  // 81°9'49.0"W
    materialType: "fill_dirt",
    pricePerLoad: 72.00,
    smithPrice: 72.00,
    countyTaxRate: TAX_FLAGLER,
    pitType: "Competitor",
    notes: "Operator: A Morea Enterprises",
  },
  {
    name: "Pro Site Callahan Pit",
    operator: "Pro Site Work LLC",
    address: "Pro Site Callahan Pit",
    city: "Callahan",
    state: "FL",
    lat: 30.184611,   // 30°11'4.6"N
    lng: -81.982389,  // 81°58'56.6"W
    materialType: "fill_dirt",
    pricePerLoad: 80.00,
    smithPrice: 80.00,
    countyTaxRate: TAX_NASSAU,
    pitType: "Competitor",
    notes: "Operator: Pro Site Work LLC",
  },
];

async function main() {
  console.log(`[seed-pits] Connecting to Postgres...`);
  const existing = await db.select({ id: pitsTable.id }).from(pitsTable);
  if (existing.length > 0) {
    console.log(`[seed-pits] Found ${existing.length} existing pits.`);
    if (process.argv.includes("--force")) {
      console.log(`[seed-pits] --force: wiping existing pits...`);
      await db.execute(sql`TRUNCATE TABLE pits RESTART IDENTITY CASCADE`);
    } else {
      console.log(`[seed-pits] Skipping. Pass --force to wipe and reseed.`);
      process.exit(0);
    }
  }

  console.log(`[seed-pits] Inserting ${SEED_PITS.length} pits...`);
  const now = new Date();
  for (const pit of SEED_PITS) {
    await db.insert(pitsTable).values({
      name: pit.name,
      address: pit.address,
      city: pit.city,
      state: pit.state,
      lat: pit.lat,
      lng: pit.lng,
      materialType: pit.materialType,
      pricePerLoad: pit.pricePerLoad,
      smithPrice: pit.smithPrice,
      notes: pit.notes
        ? `[${pit.pitType}] ${pit.notes}`
        : `[${pit.pitType}]`,
      countyTaxRate: pit.countyTaxRate,
      updatedBy: "Alex",
      updatedAt: now,
    });
    console.log(
      `  ✓ ${pit.name} (${pit.pitType}) — retail $${pit.pricePerLoad} / smith $${pit.smithPrice}`
    );
  }

  const stcCount = SEED_PITS.filter((p) => p.pitType === "Smith Trucking").length;
  const compCount = SEED_PITS.filter((p) => p.pitType === "Competitor").length;
  console.log(
    `[seed-pits] Done. ${stcCount} STC + ${compCount} Competitor = ${SEED_PITS.length} pits seeded.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-pits] FAILED:", err);
  process.exit(1);
});
