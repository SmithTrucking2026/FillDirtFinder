import { useMemo } from "react";
import { useListQuoteLog } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, TrendingUp } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  awarded: "bg-green-100 text-green-800 border-green-300",
  quoted:  "bg-blue-100 text-blue-800 border-blue-300",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  lost:    "bg-red-100 text-red-800 border-red-300",
  withdrawn: "bg-gray-100 text-gray-600 border-gray-300",
};

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

interface RecentPitQuotesProps {
  pitId: string;
  currentTotal?: number;
}

export function RecentPitQuotes({ pitId, currentTotal }: RecentPitQuotesProps) {
  const { data: allQuotes = [], isLoading } = useListQuoteLog();

  const pitQuotes = useMemo(() => {
    return allQuotes
      .filter((q) => q.pitId === pitId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [allQuotes, pitId]);

  if (isLoading) return null;

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Historical Quotes — This Pit
        </h3>
        {pitQuotes.length > 0 && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            {pitQuotes.length} record{pitQuotes.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {pitQuotes.length === 0 ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
          <Clock className="w-3.5 h-3.5" />
          No historical quotes saved for this pit yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Job</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Loads</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">$/Load</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Total</th>
                <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {pitQuotes.map((q, i) => {
                const delta =
                  currentTotal !== undefined
                    ? currentTotal - q.grandTotal
                    : null;
                return (
                  <tr
                    key={q.id}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                  >
                    <td className="px-3 py-2 font-medium max-w-[120px]">
                      <div className="truncate">{q.jobName}</div>
                      {q.companyName && (
                        <div className="text-[10px] text-muted-foreground truncate">{q.companyName}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {fmtDate(q.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{q.loads}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtCurrency(q.pricePerLoad)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">
                      <div>{fmtCurrency(q.grandTotal)}</div>
                      {delta !== null && Math.abs(delta) > 1 && (
                        <div
                          className={`text-[10px] font-normal ${delta > 0 ? "text-green-600" : "text-red-500"}`}
                        >
                          {delta > 0 ? "+" : ""}{fmtCurrency(delta)} vs now
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        className={`text-[10px] px-1.5 py-0 border ${STATUS_STYLES[q.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {q.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
