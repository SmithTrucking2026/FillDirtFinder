import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Search, Loader2 } from "lucide-react";

interface AddressSearchProps {
  onPlaceSelected: (lat: number, lng: number, formattedAddress: string) => void;
  label?: string;
  placeholder?: string;
}

export function AddressSearch({
  onPlaceSelected,
  label = "Job site address",
  placeholder = "Type an address, subdivision, or intersection...",
}: AddressSearchProps) {
  const placesLibrary = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!placesLibrary || !inputRef.current) return;

    const ac = new placesLibrary.Autocomplete(inputRef.current, {
      bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng(28.5, -82.5),
        new google.maps.LatLng(31.2, -80.5)
      ),
      componentRestrictions: { country: "us" },
      fields: ["geometry", "formatted_address", "name"],
      types: ["geocode", "establishment"],
    });

    setAutocomplete(ac);
    setIsReady(true);

    return () => {
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [placesLibrary]);

  useEffect(() => {
    if (!autocomplete) return;
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      if (!loc) return;
      onPlaceSelected(
        loc.lat(),
        loc.lng(),
        place.formatted_address ?? place.name ?? ""
      );
    });
    return () => listener.remove();
  }, [autocomplete, onPlaceSelected]);

  return (
    <div className="space-y-1">
      {label && (
        <Label className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-bold">
          <MapPin className="w-3 h-3" />
          {label}
        </Label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={isReady ? placeholder : "Loading Google Places..."}
          disabled={!isReady}
          className="pl-9"
        />
        {!isReady && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>
    </div>
  );
}
