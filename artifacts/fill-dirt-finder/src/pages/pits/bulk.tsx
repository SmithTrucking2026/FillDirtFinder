import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { useListPits, useBulkUpdatePitPrices, getListPitsQueryKey, getGetPitQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/contexts/current-user";
import { MATERIAL_COLORS } from "@/components/map";

type PitEdit = {
  pricePerLoad: number;
  countyTaxRate: number;
};

export default function BulkPitsEditor() {
  const { currentUser } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: pits = [], isLoading } = useListPits({ query: { queryKey: getListPitsQueryKey() } });
  const bulkUpdateMutation = useBulkUpdatePitPrices();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [edits, setEdits] = useState<Record<string, PitEdit>>({});

  const filteredPits = useMemo(() => {
    if (!searchTerm) return pits;
    return pits.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pits, searchTerm]);

  const handleEdit = (id: string, field: keyof PitEdit, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;
    
    setEdits(prev => {
      const currentEdit = prev[id];
      const pit = pits.find(p => p.id === id);
      if (!pit) return prev;

      const newEdit = {
        pricePerLoad: currentEdit?.pricePerLoad ?? pit.pricePerLoad,
        countyTaxRate: currentEdit?.countyTaxRate ?? (pit.countyTaxRate * 100),
        [field]: numValue
      };

      if (newEdit.pricePerLoad === pit.pricePerLoad && Math.abs(newEdit.countyTaxRate - (pit.countyTaxRate * 100)) < 0.01) {
        const next = { ...prev };
        delete next[id];
        return next;
      }

      return { ...prev, [id]: newEdit };
    });
  };

  const discardChanges = () => {
    setEdits({});
  };

  const handleSave = () => {
    if (!currentUser || Object.keys(edits).length === 0) return;

    const updates = Object.entries(edits).map(([id, edit]) => ({
      id,
      pricePerLoad: edit.pricePerLoad,
      countyTaxRate: edit.countyTaxRate / 100,
    }));

    bulkUpdateMutation.mutate({
      data: {
        updatedBy: currentUser,
        updates
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: `Updated ${updates.length} pit prices, all attributed to ${currentUser}.`
        });
        queryClient.invalidateQueries({ queryKey: getListPitsQueryKey() });
        updates.forEach(u => queryClient.invalidateQueries({ queryKey: getGetPitQueryKey(u.id) }));
        setEdits({});
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to bulk update prices.",
          variant: "destructive"
        });
      }
    });
  };

  const modifiedCount = Object.keys(edits).length;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full overflow-hidden bg-muted/10">
        <div className="p-4 border-b border-border bg-card">
          <div className="container mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="space-y-1 text-center md:text-left">
              <h1 className="text-2xl font-bold">Bulk Update Prices</h1>
              <p className="text-sm text-muted-foreground">Quickly adjust rates and taxes across all pits.</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search pits by name or city..." 
                className="pl-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 container mx-auto">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-24">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[10px] px-2"></TableHead>
                  <TableHead>Pit Name</TableHead>
                  <TableHead>City/State</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="w-[150px]">Current $/Load</TableHead>
                  <TableHead className="w-[150px]">County Tax %</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                      No pits found matching search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPits.map(pit => {
                    const isModified = !!edits[pit.id];
                    const currentPrice = edits[pit.id]?.pricePerLoad ?? pit.pricePerLoad;
                    const currentTax = edits[pit.id]?.countyTaxRate ?? (pit.countyTaxRate * 100);

                    return (
                      <TableRow key={pit.id} className={isModified ? "bg-primary/5" : ""}>
                        <TableCell className="px-2">
                          {isModified && <div className="w-2 h-2 rounded-full bg-primary mx-auto"></div>}
                        </TableCell>
                        <TableCell className="font-semibold">{pit.name}</TableCell>
                        <TableCell className="text-muted-foreground">{pit.city}, {pit.state}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize" style={{ borderColor: MATERIAL_COLORS[pit.materialType], color: MATERIAL_COLORS[pit.materialType] }}>
                            {pit.materialType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input 
                              type="number" 
                              className={`pl-6 font-mono ${isModified && edits[pit.id]?.pricePerLoad !== pit.pricePerLoad ? 'border-primary ring-1 ring-primary/20' : ''}`}
                              value={currentPrice}
                              onChange={(e) => handleEdit(pit.id, "pricePerLoad", e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input 
                              type="number" 
                              className={`pr-6 font-mono ${isModified && edits[pit.id]?.countyTaxRate !== pit.countyTaxRate * 100 ? 'border-primary ring-1 ring-primary/20' : ''}`}
                              value={currentTax}
                              onChange={(e) => handleEdit(pit.id, "countyTaxRate", e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          By {pit.updatedBy} <br/>
                          {formatDistanceToNow(new Date(pit.updatedAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className={`fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm p-4 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] transition-transform duration-300 ${modifiedCount > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="container mx-auto flex items-center justify-between">
            <div className="font-medium">
              <span className="text-primary font-bold text-lg">{modifiedCount}</span> pit{modifiedCount === 1 ? '' : 's'} modified
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={discardChanges} disabled={bulkUpdateMutation.isPending}>
                <X className="w-4 h-4 mr-2" /> Discard
              </Button>
              <Button onClick={handleSave} disabled={modifiedCount === 0 || bulkUpdateMutation.isPending}>
                {bulkUpdateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save {modifiedCount} Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
