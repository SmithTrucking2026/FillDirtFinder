import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2 } from "lucide-react";
import { useCurrentUser } from "@/contexts/current-user";
import { useToast } from "@/hooks/use-toast";

interface SaveQuoteDialogProps {
  pitId: string;
  pitName: string;
  destLat: number;
  destLng: number;
  loads: number;
  hourlyRateType: string;
  marginType: string;
  pricePerLoad: number;
  grandTotal: number;
}

export function SaveQuoteDialog(props: SaveQuoteDialogProps) {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [jobName, setJobName] = useState("");
  const [jobAddress, setJobAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isIntercompany, setIsIntercompany] = useState<"Y" | "N">("N");
  const [totalLoadQuantity, setTotalLoadQuantity] = useState<string>("");
  const [notes, setNotes] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("No current user");
      return customFetch<{ id: string }>({
        url: "/quote-log",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: {
          jobName,
          jobAddress: jobAddress || null,
          destLat: props.destLat,
          destLng: props.destLng,
          companyName: companyName || null,
          contactName: contactName || null,
          contactPhone: contactPhone || null,
          isIntercompany,
          pitId: props.pitId,
          pitNameSnapshot: props.pitName,
          loads: props.loads,
          totalLoadQuantity: totalLoadQuantity ? parseInt(totalLoadQuantity) : null,
          hourlyRateType: props.hourlyRateType,
          marginType: props.marginType,
          pricePerLoad: props.pricePerLoad,
          grandTotal: props.grandTotal,
          notes: notes || null,
          createdBy: currentUser,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/quote-log"] });
      toast({ title: "Quote saved", description: `Logged to Quote Log — ${jobName}` });
      setOpen(false);
      setJobName("");
      setJobAddress("");
      setCompanyName("");
      setContactName("");
      setContactPhone("");
      setIsIntercompany("N");
      setTotalLoadQuantity("");
      setNotes("");
    },
    onError: (err: Error) => {
      toast({
        title: "Save failed",
        description: err.message || "Could not save quote. Check console.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Save className="w-4 h-4" /> Save to Quote Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save quote to log</DialogTitle>
          <DialogDescription>
            Logged as {currentUser}. Grand total: <span className="font-mono font-semibold">${props.grandTotal.toFixed(2)}</span> • {props.pitName} • {props.loads} loads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="job-name">Job name *</Label>
            <Input
              id="job-name"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. Mill Creek Forrest"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="job-address">Job address</Label>
            <Input
              id="job-address"
              value={jobAddress}
              onChange={(e) => setJobAddress(e.target.value)}
              placeholder="Street address or lat/lng note"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="W. Gardner, Besch & Smith, etc."
              />
            </div>
            <div className="space-y-1">
              <Label>Intercompany</Label>
              <Select value={isIntercompany} onValueChange={(v) => setIsIntercompany(v as "Y" | "N")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="N">No (External)</SelectItem>
                  <SelectItem value="Y">Yes (Interco)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="total-load-qty">Total load quantity on quote</Label>
            <Input
              id="total-load-qty"
              type="number"
              min="1"
              value={totalLoadQuantity}
              onChange={(e) => setTotalLoadQuantity(e.target.value)}
              placeholder="e.g. 250"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="contact-name">Contact</Label>
              <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Material details, alternate pits considered, etc."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!jobName.trim() || save.isPending}
            className="gap-2"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Quote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
