import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { Layout } from "@/components/layout";
import { PortalBanner } from "@/components/portal-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { FileText, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QuoteStatus = "quoted" | "awarded" | "lost" | "pending" | "withdrawn";

interface QuoteLogEntry {
  id: string;
  jobName: string;
  jobAddress: string | null;
  destLat: number;
  destLng: number;
  companyName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  isIntercompany: "Y" | "N";
  pitId: string;
  pitNameSnapshot: string;
  loads: number;
  hourlyRateType: string;
  marginType: string;
  pricePerLoad: number;
  grandTotal: number;
  status: QuoteStatus;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_STYLES: Record<QuoteStatus, string> = {
  quoted: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  awarded: "bg-green-500/10 text-green-700 border-green-500/20",
  lost: "bg-red-500/10 text-red-700 border-red-500/20",
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  withdrawn: "bg-gray-500/10 text-gray-700 border-gray-500/20",
};

const STATUSES: QuoteStatus[] = ["quoted", "awarded", "lost", "pending", "withdrawn"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default function QuotesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [createdByFilter, setCreatedByFilter] = useState<"all" | "Alex" | "Justin">("all");

  const queryKey = ["/quote-log", { status: statusFilter, createdBy: createdByFilter }];
  const { data: entries = [], isLoading } = useQuery<QuoteLogEntry[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (createdByFilter !== "all") params.set("createdBy", createdByFilter);
      const qs = params.toString();
      return customFetch<QuoteLogEntry[]>({
        url: `/quote-log${qs ? `?${qs}` : ""}`,
        method: "GET",
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) =>
      customFetch<QuoteLogEntry>({
        url: `/quote-log/${id}`,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        data: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/quote-log"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Update failed", variant: "destructive" });
    },
  });

  const totalValue = entries.reduce((sum, e) => sum + e.grandTotal, 0);
  const awardedValue = entries.filter((e) => e.status === "awarded").reduce((s, e) => s + e.grandTotal, 0);

  return (
    <Layout>
      <PortalBanner variant="slim" />
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-7 h-7 text-primary" />
              Quote Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every quote generated gets logged here. Update status as jobs move through the pipeline.
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="px-4 py-2 rounded-lg bg-muted border border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total Quoted</div>
              <div className="text-lg font-mono font-bold">{formatCurrency(totalValue)}</div>
            </div>
            <div className="px-4 py-2 rounded-lg bg-green-500/5 border border-green-500/20">
              <div className="text-xs text-green-700 uppercase tracking-wider font-bold">Awarded</div>
              <div className="text-lg font-mono font-bold text-green-700">{formatCurrency(awardedValue)}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filter:</span>
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus | "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={createdByFilter} onValueChange={(v) => setCreatedByFilter(v as "all" | "Alex" | "Justin")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="Alex">Alex</SelectItem>
              <SelectItem value="Justin">Justin</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground ml-auto">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading...</div>
        ) : entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <FileText className="w-12 h-12 text-muted-foreground/40" />
            </EmptyHeader>
            <EmptyTitle>No quotes logged yet</EmptyTitle>
            <EmptyDescription>
              {statusFilter === "all" && createdByFilter === "all"
                ? "Generate a quote on the Calculator page, then click 'Save to Quote Log'."
                : "No entries match the current filters."}
            </EmptyDescription>
            <EmptyContent>
              <Button variant="outline" onClick={() => { setStatusFilter("all"); setCreatedByFilter("all"); }}>
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Pit</TableHead>
                  <TableHead className="text-right">Loads</TableHead>
                  <TableHead className="text-right">$/Load</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{e.createdBy}</TableCell>
                    <TableCell>
                      <div className="font-medium">{e.jobName}</div>
                      {e.jobAddress && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{e.jobAddress}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {e.companyName ?? <span className="text-muted-foreground italic">—</span>}
                      {e.isIntercompany === "Y" && (
                        <Badge variant="outline" className="ml-2 text-[10px]">INTERCO</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.pitNameSnapshot}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{e.loads}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{formatCurrency(e.pricePerLoad)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{formatCurrency(e.grandTotal)}</TableCell>
                    <TableCell>
                      <Select
                        value={e.status}
                        onValueChange={(newStatus) =>
                          updateStatus.mutate({ id: e.id, status: newStatus as QuoteStatus })
                        }
                      >
                        <SelectTrigger className={`w-[110px] h-7 text-xs capitalize border ${STATUS_STYLES[e.status]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}
