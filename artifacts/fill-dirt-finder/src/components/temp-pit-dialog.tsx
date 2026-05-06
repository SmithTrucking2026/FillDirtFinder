import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Package, AlertTriangle, X } from "lucide-react";
import { MaterialType, User } from "@workspace/api-client-react";
import { AddressSearch } from "@/components/address-search";

export type TempPit = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  materialType: MaterialType;
  pricePerLoad: number;
  smithPrice: number | null;
  notes: string | null;
  countyTaxRate: number;
  updatedBy: User;
  updatedAt: string;
  isTemp: true;
  availableFrom: string;
  availableTo: string;
  estimatedLoads: number;
};

interface TempPitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (pit: TempPit) => void;
  currentUser: User;
}

const toDateStr = (d: Date) => d.toISOString().split("T")[0]!;
const today = () => toDateStr(new Date());
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

export function TempPitDialog({
  open,
  onOpenChange,
  onAdd,
  currentUser,
}: TempPitDialogProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("FL");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [materialType, setMaterialType] = useState<MaterialType>(MaterialType.fill_dirt);
  const [pricePerLoad, setPricePerLoad] = useState(100);
  const [countyTaxRate, setCountyTaxRate] = useState(6.5);
  const [availableFrom, setAvailableFrom] = useState(today());
  const [availableTo, setAvailableTo] = useState(inDays(30));
  const [estimatedLoads, setEstimatedLoads] = useState(100);
  const [notes, setNotes] = useState("");

  const handlePlaceSelected = useCallback(
    (plat: number, plng: number, formattedAddress: string) => {
      setLat(plat);
      setLng(plng);
      setAddress(formattedAddress);
      const parts = formattedAddress.split(",");
      if (parts.length >= 3) {
        setCity(parts[parts.length - 3]?.trim() ?? "");
        const stateZip = parts[parts.length - 2]?.trim() ?? "";
        setState(stateZip.split(" ")[0] ?? "FL");
      }
    },
    []
  );

  const reset = () => {
    setName("");
    setAddress("");
    setCity("");
    setState("FL");
    setLat(null);
    setLng(null);
    setMaterialType(MaterialType.fill_dirt);
    setPricePerLoad(100);
    setCountyTaxRate(6.5);
    setAvailableFrom(today());
    setAvailableTo(inDays(30));
    setEstimatedLoads(100);
    setNotes("");
  };

  const handleAdd = () => {
    if (!name.trim() || lat === null || lng === null) return;
    onAdd({
      id: `temp-${Date.now()}`,
      name: name.trim(),
      address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: city || "—",
      state: state || "FL",
      lat,
      lng,
      materialType,
      pricePerLoad,
      smithPrice: null,
      notes: notes.trim() || null,
      countyTaxRate: countyTaxRate / 100,
      updatedBy: currentUser,
      updatedAt: new Date().toISOString(),
      isTemp: true,
      availableFrom,
      availableTo,
      estimatedLoads,
    });
    reset();
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0 && lat !== null && lng !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 border font-bold text-[10px]">
              TEMP
            </Badge>
            Add Temporary Source Pit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-1.5">
            <Label>
              Pit Name / Identifier{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. Jones Property, CR 208 Stockpile..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Location{" "}
              <span className="text-destructive">*</span>
            </p>
            <AddressSearch
              onPlaceSelected={handlePlaceSelected}
              label=""
              placeholder="Search address to set coordinates..."
            />
            {lat !== null && lng !== null ? (
              <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-md px-3 py-2">
                <MapPin className="w-3 h-3 text-green-600 shrink-0" />
                <span className="text-green-700 font-mono">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-5 px-1 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setLat(null);
                    setLng(null);
                    setAddress("");
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Search an address above to pin the location
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">State</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  placeholder="FL"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
              Material &amp; Pricing
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Material</Label>
                <Select
                  value={materialType}
                  onValueChange={(v) => setMaterialType(v as MaterialType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(MaterialType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Price / Load ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={pricePerLoad}
                  onChange={(e) => setPricePerLoad(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">County Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={countyTaxRate}
                onChange={(e) => setCountyTaxRate(Number(e.target.value))}
                className="font-mono"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Availability Window
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-muted-foreground" />
              Estimated Quantity (loads)
            </Label>
            <Input
              type="number"
              min="1"
              value={estimatedLoads}
              onChange={(e) =>
                setEstimatedLoads(parseInt(e.target.value) || 1)
              }
              className="font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Stockpile location, access info, contact, restrictions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!isValid} className="gap-2">
            <MapPin className="w-4 h-4" />
            Add Temp Pit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
