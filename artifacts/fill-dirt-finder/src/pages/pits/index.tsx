import { useState } from "react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { 
  useListPits, 
  useDeletePit 
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { TruckingMap, GoogleMapsGate, MATERIAL_COLORS } from "@/components/map";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MapPin, Edit, Trash2, Edit3 } from "lucide-react";
import { MaterialType } from "@workspace/api-client-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PortalBanner } from "@/components/portal-banner";

export default function PitsDirectory() {
  const [, setLocation] = useLocation();
  const { data: pits = [], isLoading } = useListPits();
  const deletePitMutation = useDeletePit();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [selectedPitId, setSelectedPitId] = useState<string | null>(null);

  const filteredPits = pits.filter(pit => {
    const matchesSearch = pit.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         pit.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMaterial = materialFilter === "all" || pit.materialType === materialFilter;
    return matchesSearch && matchesMaterial;
  });

  const selectedPit = pits.find(p => p.id === selectedPitId);

  const handleDelete = (id: string) => {
    deletePitMutation.mutate({ id }, {
      onSuccess: () => {
        if (selectedPitId === id) setSelectedPitId(null);
      }
    });
  };

  return (
    <Layout>
      <PortalBanner variant="slim" />
      <div className="flex flex-col h-full bg-muted/20">
        <div className="h-[35vh] shrink-0 border-b border-border bg-muted">
          <GoogleMapsGate>
            <TruckingMap 
              pits={filteredPits}
              selectedPitId={selectedPitId}
              onPitClick={setSelectedPitId}
              className="w-full h-full"
            />
          </GoogleMapsGate>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search pits or cities..." 
                    className="pl-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={materialFilter} onValueChange={setMaterialFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {Object.values(MaterialType).map(t => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLocation("/pits/bulk")} className="gap-2">
                  <Edit3 className="w-4 h-4" /> Bulk Update Prices
                </Button>
                <Button onClick={() => setLocation("/pits/new")} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Pit
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Pit Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">$/Load</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                          No pits found matching filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPits.map(pit => (
                        <TableRow 
                          key={pit.id} 
                          className={`cursor-pointer hover:bg-muted/50 ${selectedPitId === pit.id ? 'bg-primary/5' : ''}`}
                          onClick={() => setSelectedPitId(pit.id)}
                        >
                          <TableCell className="font-semibold">{pit.name}</TableCell>
                          <TableCell>{pit.city}, {pit.state}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize" style={{ borderColor: MATERIAL_COLORS[pit.materialType], color: MATERIAL_COLORS[pit.materialType] }}>
                              {pit.materialType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">${pit.pricePerLoad}</TableCell>
                          <TableCell className="text-right font-mono">{(pit.countyTaxRate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-sm text-muted-foreground text-nowrap">
                            By {pit.updatedBy} <br/>
                            {formatDistanceToNow(new Date(pit.updatedAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {selectedPit && (
            <div className="w-full md:w-80 lg:w-96 border-l border-border bg-card overflow-y-auto shrink-0 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 animate-in slide-in-from-right-8">
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-1">{selectedPit.name}</h3>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedPit.address}, {selectedPit.city}, {selectedPit.state}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Price</div>
                    <div className="text-xl font-mono">${selectedPit.pricePerLoad}</div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg border border-border">
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Material</div>
                    <div className="text-sm font-semibold capitalize">{selectedPit.materialType.replace("_", " ")}</div>
                  </div>
                </div>

                {selectedPit.notes && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Notes</div>
                    <p className="text-sm bg-accent/10 border border-accent/20 p-3 rounded-md text-foreground">
                      {selectedPit.notes}
                    </p>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Status</div>
                  <div className="text-sm flex justify-between">
                    <span>Tax Rate</span>
                    <span className="font-mono">{(selectedPit.countyTaxRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="text-sm flex justify-between">
                    <span>Lat/Lng</span>
                    <span className="font-mono text-xs">{selectedPit.lat.toFixed(4)}, {selectedPit.lng.toFixed(4)}</span>
                  </div>
                  <div className="text-sm flex justify-between pt-2 text-muted-foreground">
                    <span>Last Updated</span>
                    <span className="text-right">
                      {formatDistanceToNow(new Date(selectedPit.updatedAt), { addSuffix: true })}<br/>
                      by {selectedPit.updatedBy}
                    </span>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <Button className="flex-1" onClick={() => setLocation(`/pits/${selectedPit.id}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Pit
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedPit.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. Quotes that used this pit historically will retain their snapshot data, but this pit will no longer be available for new quotes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(selectedPit.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
