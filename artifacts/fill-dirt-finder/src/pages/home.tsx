import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListPits, 
  useGetNearestPit, 
  useCalculateQuote,
  getGetNearestPitQueryKey 
} from "@workspace/api-client-react";
import { 
  HourlyRateType, 
  MarginType, 
  MaterialType 
} from "@workspace/api-client-react";
import { useDebounceValue } from "@/hooks/use-debounce";
import { useDriveTime } from "@/hooks/use-drive-time";
import { TruckingMap, GoogleMapsGate } from "@/components/map";
import { AddressSearch } from "@/components/address-search";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Calculator, Zap, Gauge, Plus, X, Leaf, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { PortalBanner } from "@/components/portal-banner";
import { SaveQuoteDialog } from "@/components/save-quote-dialog";
import { TempPitDialog, type TempPit } from "@/components/temp-pit-dialog";
import { RecentPitQuotes } from "@/components/recent-pit-quotes";
import { useCurrentUser } from "@/contexts/current-user";

export default function Home() {
  const queryClient = useQueryClient();
  const { currentUser } = useCurrentUser();

  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [destLabel, setDestLabel] = useState<string>("");

  const [tempPits, setTempPits] = useState<TempPit[]>([]);
  const [tempPitDialogOpen, setTempPitDialogOpen] = useState(false);
  const [useInnerDirt, setUseInnerDirt] = useState(false);

  const [useNearest, setUseNearest] = useState(true);
  const [selectedPitId, setSelectedPitId] = useState<string>("");
  const [loads, setLoads] = useState<number>(1);
  const [hourlyRateType, setHourlyRateType] = useState<HourlyRateType>(HourlyRateType.regular);
  const [marginType, setMarginType] = useState<MarginType>(MarginType.external);
  const [avgSpeed, setAvgSpeed] = useState<number>(35);
  const [loadBuffer, setLoadBuffer] = useState<number>(15);

  const { data: serverPits = [], isLoading: isLoadingPits } = useListPits();

  const allPits = useMemo(() => [...serverPits, ...tempPits], [serverPits, tempPits]);
  const tempPitIds = useMemo(() => new Set(tempPits.map((p) => p.id)), [tempPits]);

  const nearestQueryEnabled = useNearest && destLat !== null && destLng !== null;
  const { data: nearestPitResult, isLoading: isFetchingNearest } = useGetNearestPit(
    { lat: destLat!, lng: destLng! }, 
    { query: { enabled: nearestQueryEnabled, queryKey: getGetNearestPitQueryKey({ lat: destLat!, lng: destLng! }) } }
  );

  useEffect(() => {
    if (useNearest && nearestPitResult?.pit?.id) {
      setSelectedPitId(nearestPitResult.pit.id);
    }
  }, [useNearest, nearestPitResult]);

  const selectedPit = useMemo(
    () => allPits.find((p) => p.id === selectedPitId) ?? null,
    [allPits, selectedPitId]
  );

  const innerDirtPrice: number | null = useMemo(() => {
    if (!selectedPit) return null;
    const smith = selectedPit.smithPrice ?? null;
    if (smith === null) return null;
    if (smith >= selectedPit.pricePerLoad) return null;
    return smith;
  }, [selectedPit]);

  const calculateQuoteMutation = useCalculateQuote();

  const debouncedLat = useDebounceValue(destLat, 250);
  const debouncedLng = useDebounceValue(destLng, 250);
  const debouncedLoads = useDebounceValue(loads, 250);
  const debouncedSpeed = useDebounceValue(avgSpeed, 250);
  const debouncedBuffer = useDebounceValue(loadBuffer, 250);

  // Drive time uses non-debounced destination to fire as soon as pit + address are both known.
  const driveTime = useDriveTime({
    origin: selectedPit ? { lat: selectedPit.lat, lng: selectedPit.lng } : null,
    destination: destLat !== null && destLng !== null ? { lat: destLat, lng: destLng } : null,
    enabled: !!selectedPit && destLat !== null && destLng !== null,
  });

  // Key for the current pit + destination pair using the same (non-debounced) coords as
  // the drive time hook. freshDriveTime is only set when the Routes API (or haversine
  // fallback) has resolved for THIS exact pair — prevents a stale result from poisoning the quote.
  const currentDriveTimeKey =
    selectedPit && destLat !== null && destLng !== null
      ? `${selectedPit.lat.toFixed(6)}|${selectedPit.lng.toFixed(6)}|${destLat.toFixed(6)}|${destLng.toFixed(6)}`
      : null;

  const freshDriveTime =
    driveTime.resultKey !== null && driveTime.resultKey === currentDriveTimeKey
      ? driveTime.data
      : null;

  // Stop waiting if drive time errored — fall back to haversine in that case.
  const waitingForDriveTime =
    currentDriveTimeKey !== null && freshDriveTime === null && !driveTime.error;

  // driveTimeReady: we have fresh road data OR drive time errored (haversine fallback).
  const driveTimeReady = freshDriveTime !== null || driveTime.error !== null;

  // Stable primitive key for the quote effect dep — prevents object-reference churn from
  // React Strict Mode's double-fire from triggering repeated calculateQuote resets.
  const freshDriveTimeKey = freshDriveTime
    ? `${freshDriveTime.driveTimeMinutes.toFixed(2)}|${freshDriveTime.driveDistanceMiles.toFixed(4)}|${freshDriveTime.source}`
    : null;

  useEffect(() => {
    if (
      driveTimeReady &&
      debouncedLat !== null &&
      debouncedLng !== null &&
      selectedPitId
    ) {
      calculateQuoteMutation.mutate({
        data: {
          pitId: selectedPitId,
          destLat: debouncedLat,
          destLng: debouncedLng,
          loads: debouncedLoads || 1,
          hourlyRateType,
          marginType,
          avgSpeedMph: debouncedSpeed,
          loadBufferMinutes: debouncedBuffer,
          // Only pass drive time if it's fresh for this exact pair.
          driveTimeMinutes: freshDriveTime?.driveTimeMinutes,
          driveDistanceMiles: freshDriveTime?.driveDistanceMiles,
          overridePricePerLoad: useInnerDirt && innerDirtPrice !== null ? innerDirtPrice : undefined,
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedPitId,
    debouncedLat,
    debouncedLng,
    debouncedLoads,
    hourlyRateType,
    marginType,
    debouncedSpeed,
    debouncedBuffer,
    driveTimeReady,
    freshDriveTimeKey,   // ← stable string, not object reference
    useInnerDirt,
    innerDirtPrice,
  ]);

  const quote = calculateQuoteMutation.data;
  const isCalculating =
    calculateQuoteMutation.isPending || isFetchingNearest || driveTime.isLoading || waitingForDriveTime;

  const handleMapClick = (lat: number, lng: number) => {
    setDestLat(lat);
    setDestLng(lng);
    setDestLabel("");
  };

  const handleAddressSelected = (lat: number, lng: number, formattedAddress: string) => {
    setDestLat(lat);
    setDestLng(lng);
    setDestLabel(formattedAddress);
  };

  const handlePitClick = (pitId: string) => {
    setSelectedPitId(pitId);
    setUseNearest(false);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <Layout>
      <PortalBanner />
      <GoogleMapsGate>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/2 flex flex-col border-r border-border bg-background overflow-y-auto">
            <div className="px-6 pt-4 pb-2 border-b border-border bg-muted/30">
              <AddressSearch onPlaceSelected={handleAddressSelected} />
              {destLat !== null ? (
                <div className="mt-2 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                  {destLabel ? (
                    <span className="text-xs text-muted-foreground truncate">{destLabel}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pin dropped at</span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground/70 ml-1">
                    ({destLat.toFixed(5)}, {destLng!.toFixed(5)})
                  </span>
                  <button
                    onClick={() => { setDestLat(null); setDestLng(null); setDestLabel(""); }}
                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                    title="Clear job site pin"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground/60 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Search above or click the map to drop a pin
                </p>
              )}
            </div>
            <div className="h-[45vh] lg:h-[350px] shrink-0 border-b border-border p-0">
              <TruckingMap
                jobSite={destLat && destLng ? [destLat, destLng] : null}
                onMapClick={handleMapClick}
                pits={allPits}
                selectedPitId={selectedPitId}
                onPitClick={handlePitClick}
                nearestPit={useNearest ? nearestPitResult?.pit : null}
                drawRoute={useNearest}
                tempPitIds={tempPitIds}
                className="h-full w-full"
              />
            </div>

            <div className="flex-1 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Quote Parameters
                </h2>
                {destLat === null && (
                  <div className="text-sm font-medium text-destructive animate-pulse flex items-center gap-2 bg-destructive/10 px-3 py-1 rounded-full">
                    Search address or click map
                  </div>
                )}
              </div>

              <div className="space-y-4 bg-muted/50 p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-nearest" className="text-base font-semibold cursor-pointer">Use nearest pit automatically</Label>
                  <Switch 
                    id="use-nearest" 
                    checked={useNearest} 
                    onCheckedChange={setUseNearest} 
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inner-dirt" className="text-base font-semibold cursor-pointer flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-green-600" />
                      Use inner dirt price
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {innerDirtPrice !== null
                        ? `Override material cost to $${innerDirtPrice.toFixed(2)}/load (STC transfer price)`
                        : "No Smith price available for this pit"}
                    </p>
                  </div>
                  <Switch
                    id="inner-dirt"
                    checked={useInnerDirt}
                    onCheckedChange={setUseInnerDirt}
                    disabled={innerDirtPrice === null}
                  />
                </div>

                {!useNearest && (
                  <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Select Borrow Pit</Label>
                    <Select value={selectedPitId} onValueChange={setSelectedPitId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a pit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tempPits.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-amber-600">
                              Temporary Sources
                            </div>
                            {tempPits.map(pit => (
                              <SelectItem key={pit.id} value={pit.id}>
                                <span className="flex items-center gap-1.5">
                                  <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 border font-bold text-[9px] px-1 py-0">TEMP</Badge>
                                  {pit.name} • {pit.materialType.replace("_"," ")} (${pit.pricePerLoad})
                                </span>
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-t mt-1">
                              Permanent Pits
                            </div>
                          </>
                        )}
                        {serverPits.map(pit => (
                          <SelectItem key={pit.id} value={pit.id}>
                            {pit.name} • {pit.materialType} (${pit.pricePerLoad})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 border-dashed text-amber-700 border-amber-400 hover:bg-amber-50 hover:border-amber-500"
                    onClick={() => setTempPitDialogOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Temporary Source Pit
                  </Button>
                  {tempPits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tempPits.map(tp => (
                        <div key={tp.id} className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-full px-2 py-0.5">
                          <span className="max-w-[120px] truncate">{tp.name}</span>
                          <button
                            onClick={() => {
                              setTempPits(prev => prev.filter(p => p.id !== tp.id));
                              if (selectedPitId === tp.id) setSelectedPitId("");
                            }}
                            className="hover:text-destructive ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Rates & Margins</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Hourly Rate</Label>
                      <Select value={hourlyRateType} onValueChange={(v) => setHourlyRateType(v as HourlyRateType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={HourlyRateType.mass_grade}>Mass Grade ($85/hr)</SelectItem>
                          <SelectItem value={HourlyRateType.regular}>Regular ($95/hr)</SelectItem>
                          <SelectItem value={HourlyRateType.hourly_rate}>Hourly Rate ($100/hr)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Margin</Label>
                      <Select value={marginType} onValueChange={(v) => setMarginType(v as MarginType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={MarginType.external}>External (20%)</SelectItem>
                          <SelectItem value={MarginType.interco}>Interco (15%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Job Details</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Number of Loads</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={loads} 
                        onChange={e => setLoads(parseInt(e.target.value) || 1)} 
                        className="text-lg font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Speed (MPH)</Label>
                        <Input 
                          type="number" 
                          value={avgSpeed} 
                          onChange={e => setAvgSpeed(parseInt(e.target.value) || 35)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Buffer (min)</Label>
                        <Input 
                          type="number" 
                          value={loadBuffer} 
                          onChange={e => setLoadBuffer(parseInt(e.target.value) || 15)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 bg-card overflow-y-auto p-6">
            {!destLat || !selectedPitId ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <Calculator className="w-16 h-16 opacity-20" />
                <p className="text-lg font-medium">Select a job site on the map to generate quote</p>
              </div>
            ) : (
              <div className="max-w-xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Quote Breakdown</h2>
                  <div className="flex items-center gap-3">
                    {isCalculating && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                    {quote && !isCalculating && (
                      <SaveQuoteDialog
                        pitId={quote.pit.id}
                        pitName={quote.pit.name}
                        destLat={destLat}
                        destLng={destLng!}
                        loads={quote.loads}
                        hourlyRateType={hourlyRateType}
                        marginType={marginType}
                        pricePerLoad={quote.totalPerLoad}
                        grandTotal={quote.grandTotal}
                      />
                    )}
                  </div>
                </div>

                {quote ? (
                  <>
                    <Card className="border-primary/20 shadow-sm bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex justify-between items-start gap-2">
                          <span>{quote.pit.name}</span>
                          <span className="text-primary font-mono whitespace-nowrap">
                            {quote.priceWasOverridden ? (
                              <span className="flex flex-col items-end gap-0.5">
                                <span className="text-green-700">${quote.materialPerLoad}/load</span>
                                <span className="text-xs line-through text-muted-foreground font-normal">${quote.marketPricePerLoad}/load market</span>
                              </span>
                            ) : (
                              `$${quote.pit.pricePerLoad}/load`
                            )}
                          </span>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {quote.pit.materialType.replace("_", " ")} • {quote.pit.city}, {quote.pit.state}
                          {quote.priceWasOverridden && (
                            <Badge className="bg-green-100 text-green-800 border-green-300 border text-[10px] px-1.5 py-0 gap-1">
                              <Leaf className="w-2.5 h-2.5" /> Inner Dirt
                            </Badge>
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <div className="bg-background rounded-xl border border-border p-6 shadow-sm font-mono text-sm space-y-4">
                      <div className="flex items-center justify-between -mt-2 mb-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Drive time source</span>
                        {quote.distanceSource === "routes_api" ? (
                          <Badge className="gap-1 text-[10px] bg-green-500/10 text-green-700 border-green-500/20 border">
                            <Zap className="w-3 h-3" /> Speed Limit Based (Routes API)
                          </Badge>
                        ) : (
                          <Badge className="gap-1 text-[10px] bg-yellow-500/10 text-yellow-700 border-yellow-500/20 border">
                            <Gauge className="w-3 h-3" /> Estimated (haversine × avg speed)
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance</span>
                        <span className="font-medium">{quote.distanceMiles.toFixed(1)} miles</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">One-way drive</span>
                        <span className="font-medium">{Math.round(quote.oneWayMinutes)} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Round-trip</span>
                        <span className="font-medium">{Math.round(quote.roundTripMinutes)} min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Load buffer</span>
                        <span className="font-medium">+ {quote.loadBufferMinutes} min</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total Time / Load</span>
                        <span>{Math.round(quote.totalMinutesPerLoad)} min</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Loads / truck / day <span className="text-xs">(9.5 hr day)</span></span>
                        <span className="font-medium text-foreground">{quote.loadsPerTruckPerDay.toFixed(1)}</span>
                      </div>
                      
                      <div className="pt-4 flex justify-between">
                        <span className="text-muted-foreground">Hourly Rate</span>
                        <span>${quote.hourlyRate}/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trucking / Load</span>
                        <span>{formatCurrency(quote.truckingPerLoad)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Margin ({(quote.marginPercent * 100).toFixed(0)}%)</span>
                        <span className="text-accent-foreground font-bold">{formatCurrency(quote.truckingWithMarginPerLoad)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          Material / Load
                          {quote.priceWasOverridden && (
                            <Badge className="bg-green-100 text-green-700 border-green-300 border text-[9px] px-1 py-0 gap-0.5 font-sans">
                              <Leaf className="w-2.5 h-2.5" /> inner dirt
                            </Badge>
                          )}
                        </span>
                        <span>
                          + {formatCurrency(quote.materialPerLoad)}
                          {quote.priceWasOverridden && (
                            <span className="text-xs line-through text-muted-foreground ml-2">
                              {formatCurrency(quote.marketPricePerLoad)}
                            </span>
                          )}
                        </span>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatCurrency(quote.subtotalPerLoad)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">County Tax ({(quote.countyTaxRate * 100).toFixed(1)}%)</span>
                        <span>+ {formatCurrency(quote.taxPerLoad)}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold text-base pt-2">
                        <span>Total / Load</span>
                        <span>{formatCurrency(quote.totalPerLoad)}</span>
                      </div>

                      <div className="pt-4 flex justify-between text-muted-foreground">
                        <span>Loads</span>
                        <span>× {quote.loads}</span>
                      </div>

                      <Separator className="my-2 border-primary/30" />
                      
                      <div className="flex justify-between font-bold text-3xl text-primary py-2 tracking-tight">
                        <span>Grand Total</span>
                        <span>{formatCurrency(quote.grandTotal)}</span>
                      </div>
                    </div>

                    {quote.priceWasOverridden && (() => {
                      const savingsPerLoad = quote.marketPricePerLoad - quote.materialPerLoad;
                      const totalSavings = savingsPerLoad * quote.loads;
                      const marketSubtotal = (quote.truckingWithMarginPerLoad + quote.marketPricePerLoad);
                      const marketGrand = marketSubtotal * (1 + quote.countyTaxRate) * quote.loads;
                      return (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
                            <TrendingDown className="w-4 h-4" />
                            Inner Dirt vs Market Price Comparison
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs text-center">
                            <div className="bg-white/60 rounded-lg p-2">
                              <div className="text-muted-foreground mb-1">Market Total</div>
                              <div className="font-mono font-bold line-through text-muted-foreground">
                                {formatCurrency(marketGrand)}
                              </div>
                            </div>
                            <div className="bg-green-100 rounded-lg p-2 border border-green-300">
                              <div className="text-green-700 mb-1">Inner Dirt Total</div>
                              <div className="font-mono font-bold text-green-800">
                                {formatCurrency(quote.grandTotal)}
                              </div>
                            </div>
                            <div className="bg-white/60 rounded-lg p-2">
                              <div className="text-muted-foreground mb-1">Total Savings</div>
                              <div className="font-mono font-bold text-green-700">
                                {formatCurrency(totalSavings)}
                              </div>
                            </div>
                          </div>
                          <p className="text-[11px] text-green-700">
                            {formatCurrency(savingsPerLoad)} less per load × {quote.loads} load{quote.loads !== 1 ? "s" : ""}
                          </p>
                        </div>
                      );
                    })()}

                    <RecentPitQuotes
                      pitId={selectedPitId}
                      currentTotal={quote.grandTotal}
                    />
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center">
                    <span className="text-muted-foreground">Calculating quote...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </GoogleMapsGate>
      <TempPitDialog
        open={tempPitDialogOpen}
        onOpenChange={setTempPitDialogOpen}
        onAdd={(pit) => {
          setTempPits((prev) => [...prev, pit]);
          setSelectedPitId(pit.id);
          setUseNearest(false);
        }}
        currentUser={currentUser}
      />
    </Layout>
  );
}
