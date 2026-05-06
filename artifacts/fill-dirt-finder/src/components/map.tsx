import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import type { Pit, MaterialType } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  fill_dirt: "#8B4513",
  topsoil: "#2E8B57",
  sand: "#DAA520",
  rock: "#708090",
  gravel: "#A9A9A9",
  mixed: "#CD853F",
};

function PolylineHelper({ jobSite, nearestPit }: { jobSite: [number, number]; nearestPit: Pit }) {
  const map = useMap();
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !window.google) return;

    const line = new window.google.maps.Polyline({
      path: [
        { lat: jobSite[0], lng: jobSite[1] },
        { lat: nearestPit.lat, lng: nearestPit.lng }
      ],
      geodesic: true,
      strokeColor: '#D2691E',
      strokeOpacity: 0.7,
      strokeWeight: 3,
      icons: [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 4
        },
        offset: '0',
        repeat: '20px'
      }]
    });

    line.setMap(map);
    setPolyline(line);

    return () => {
      line.setMap(null);
    };
  }, [map, jobSite, nearestPit]);

  return null;
}

interface MapProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  jobSite?: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  pits?: Pit[];
  selectedPitId?: string | null;
  onPitClick?: (pitId: string) => void;
  nearestPit?: Pit | null;
  drawRoute?: boolean;
  tempPitIds?: Set<string>;
}

export function TruckingMap({
  className,
  center = [29.8946, -81.3145],
  zoom = 9,
  jobSite,
  onMapClick,
  pits = [],
  selectedPitId,
  onPitClick,
  nearestPit,
  drawRoute = false,
  tempPitIds = new Set(),
}: MapProps) {
  return (
    <div className={cn("relative w-full h-full min-h-[300px] z-0 overflow-hidden bg-muted", className)}>
      <Map
        defaultCenter={{ lat: center[0], lng: center[1] }}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        onClick={(e) => {
          if (e.detail.latLng && onMapClick) {
            onMapClick(e.detail.latLng.lat, e.detail.latLng.lng);
          }
        }}
        mapId="smith-trucking-map"
      >
        {jobSite && (
          <AdvancedMarker position={{ lat: jobSite[0], lng: jobSite[1] }}>
            <Pin background="#D2691E" borderColor="#fff" glyphColor="#fff" scale={1.5} />
          </AdvancedMarker>
        )}

        {pits.map(pit => {
          const isSelected = selectedPitId === pit.id || nearestPit?.id === pit.id;
          const isTemp = tempPitIds.has(pit.id);
          return (
            <AdvancedMarker
              key={pit.id}
              position={{ lat: pit.lat, lng: pit.lng }}
              onClick={() => onPitClick?.(pit.id)}
              title={isTemp ? `⏱ TEMP: ${pit.name}` : pit.name}
            >
              <Pin
                background={isTemp ? "#f59e0b" : (MATERIAL_COLORS[pit.materialType] || "#666")}
                borderColor={isSelected ? "#000" : isTemp ? "#92400e" : "#fff"}
                glyphColor={isSelected ? "#000" : "#fff"}
                scale={isTemp ? (isSelected ? 1.3 : 1.1) : (isSelected ? 1.2 : 1)}
              />
            </AdvancedMarker>
          );
        })}

        {drawRoute && jobSite && nearestPit && (
          <PolylineHelper jobSite={jobSite} nearestPit={nearestPit} />
        )}
      </Map>

      <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 text-[10px] rounded shadow-sm z-10 text-muted-foreground border border-border font-medium">
        Map data: Google Maps
      </div>
    </div>
  );
}

export function GoogleMapsGate({ children }: { children: React.ReactNode }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      setAuthError(
        "Google Maps rejected the API key. Most common causes: " +
        "(1) Maps JavaScript API / Places API / Distance Matrix API not enabled, " +
        "(2) HTTP referrer restrictions don't include this domain, " +
        "(3) billing is not enabled on the Google Cloud project, " +
        "(4) key has expired or been revoked."
      );
    };
    return () => {
      delete (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
    };
  }, [apiKey]);

  if (!apiKey) {
    return (
      <div className="w-full h-full min-h-[300px] bg-muted flex items-center justify-center flex-col text-center p-6 space-y-2 border border-border rounded-md">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="font-semibold text-lg">Google Maps key not configured</p>
        <p className="text-sm text-muted-foreground">Add VITE_GOOGLE_MAPS_API_KEY to your environment variables to use the map and address search.</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="w-full h-full min-h-[300px] bg-destructive/5 flex items-center justify-center flex-col text-center p-6 space-y-3 border border-destructive/20 rounded-md">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="font-semibold text-lg text-destructive">Google Maps authentication failed</p>
        <p className="text-sm text-muted-foreground max-w-md">{authError}</p>
        <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
          Open the browser console for the exact error from Google.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "routes"]}>
      {children}
    </APIProvider>
  );
}
