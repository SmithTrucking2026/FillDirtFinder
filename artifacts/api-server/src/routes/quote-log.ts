import { Router, type IRouter } from "express";
import { db, quoteLogTable } from "@workspace/db";
import { desc, eq, and, SQL } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const QuoteStatusEnum = z.enum([
  "quoted",
  "awarded",
  "lost",
  "pending",
  "withdrawn",
]);
const UserEnum = z.enum(["Alex", "Justin"]);
const HourlyRateTypeEnum = z.enum(["mass_grade", "regular", "hourly_rate"]);
const MarginTypeEnum = z.enum(["external", "interco"]);
const IntercompanyEnum = z.enum(["Y", "N"]);

const SaveQuoteLogBody = z.object({
  jobName: z.string().min(1),
  jobAddress: z.string().nullable().optional(),
  destLat: z.number(),
  destLng: z.number(),
  companyName: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  isIntercompany: IntercompanyEnum,
  pitId: z.string().uuid(),
  pitNameSnapshot: z.string(),
  loads: z.number().int().min(1),
  totalLoadQuantity: z.number().int().min(1).nullable().optional(),
  hourlyRateType: HourlyRateTypeEnum,
  marginType: MarginTypeEnum,
  pricePerLoad: z.number().min(0),
  grandTotal: z.number().min(0),
  notes: z.string().nullable().optional(),
  createdBy: UserEnum,
});

const UpdateQuoteLogBody = z.object({
  status: QuoteStatusEnum.optional(),
  notes: z.string().nullable().optional(),
  jobName: z.string().min(1).optional(),
  companyName: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
});

const ListQuoteLogQuery = z.object({
  status: QuoteStatusEnum.optional(),
  createdBy: UserEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

function rowToEntry(row: typeof quoteLogTable.$inferSelect) {
  return {
    id: row.id,
    jobName: row.jobName,
    jobAddress: row.jobAddress,
    destLat: row.destLat,
    destLng: row.destLng,
    companyName: row.companyName,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    isIntercompany: row.isIntercompany,
    pitId: row.pitId,
    pitNameSnapshot: row.pitNameSnapshot,
    loads: row.loads,
    totalLoadQuantity: row.totalLoadQuantity ?? null,
    hourlyRateType: row.hourlyRateType,
    marginType: row.marginType,
    pricePerLoad: row.pricePerLoad,
    grandTotal: row.grandTotal,
    status: row.status,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/quote-log", async (req, res) => {
  const { status, createdBy, limit } = ListQuoteLogQuery.parse(req.query);

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(quoteLogTable.status, status));
  if (createdBy) conditions.push(eq(quoteLogTable.createdBy, createdBy));

  const rows = await db
    .select()
    .from(quoteLogTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(quoteLogTable.createdAt))
    .limit(limit);

  res.json(rows.map(rowToEntry));
});

router.post("/quote-log", async (req, res) => {
  const body = SaveQuoteLogBody.parse(req.body);
  const now = new Date();
  const [row] = await db
    .insert(quoteLogTable)
    .values({
      jobName: body.jobName,
      jobAddress: body.jobAddress ?? null,
      destLat: body.destLat,
      destLng: body.destLng,
      companyName: body.companyName ?? null,
      contactName: body.contactName ?? null,
      contactPhone: body.contactPhone ?? null,
      isIntercompany: body.isIntercompany,
      pitId: body.pitId,
      pitNameSnapshot: body.pitNameSnapshot,
      loads: body.loads,
      totalLoadQuantity: body.totalLoadQuantity ?? null,
      hourlyRateType: body.hourlyRateType,
      marginType: body.marginType,
      pricePerLoad: body.pricePerLoad,
      grandTotal: body.grandTotal,
      status: "quoted",
      notes: body.notes ?? null,
      createdBy: body.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  res.status(201).json(rowToEntry(row!));
});

router.patch("/quote-log/:id", async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const body = UpdateQuoteLogBody.parse(req.body);

  const update: Partial<typeof quoteLogTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.status !== undefined) update.status = body.status;
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.jobName !== undefined) update.jobName = body.jobName;
  if (body.companyName !== undefined) update.companyName = body.companyName;
  if (body.contactName !== undefined) update.contactName = body.contactName;
  if (body.contactPhone !== undefined) update.contactPhone = body.contactPhone;

  const [row] = await db
    .update(quoteLogTable)
    .set(update)
    .where(eq(quoteLogTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ message: "Quote log entry not found" });
    return;
  }
  res.json(rowToEntry(row));
});

export default router;
