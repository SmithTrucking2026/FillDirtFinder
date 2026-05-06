import { useEffect, useState } from "react";
import { useGetDriveTime } from "@workspace/api-client-react";

interface DriveTimeResult {
  driveTimeMinutes: number;
  driveDistanceMiles: number;
  source: "routes_api" | "haversine_fallback";
}

interface UseDriveTimeOptions {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  enabled?: boolean;
}

function makeKey(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): string {
  return `${origin.lat.toFixed(6)}|${origin.lng.toFixed(6)}|${dest.lat.toFixed(6)}|${dest.lng.toFixed(6)}`;
}

export function useDriveTime({
  origin,
  destination,
  enabled = true,
}: UseDriveTimeOptions): {
  data: DriveTimeResult | null;
  isLoading: boolean;
  error: string | null;
  resultKey: string | null;
} {
  // Hook order is fixed — useState BEFORE useGetDriveTime.
  const [driveTimeError, setDriveTimeError] = useState<string | null>(null);
  const [resultKey, setResultKey] = useState<string | null>(null);

  const mutation = useGetDriveTime();

  const shouldFetch = enabled && origin !== null && destination !== null;

  useEffect(() => {
    if (!shouldFetch || !origin || !destination) return;
    const key = makeKey(origin, destination);
    setDriveTimeError(null);
    mutation.mutate(
      {
        data: {
          originLat: origin.lat,
          originLng: origin.lng,
          destLat: destination.lat,
          destLng: destination.lng,
        },
      },
      {
        onSuccess: () => {
          setResultKey(key);
        },
        onError: (err) => {
          setDriveTimeError(
            err instanceof Error ? err.message : "Drive time fetch failed"
          );
        },
      }
    );
    // mutation is intentionally excluded — it's a stable RQ reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, shouldFetch]);

  if (!shouldFetch) {
    return { data: null, isLoading: false, error: null, resultKey: null };
  }

  return {
    data: mutation.data
      ? {
          driveTimeMinutes: mutation.data.driveTimeMinutes,
          driveDistanceMiles: mutation.data.driveDistanceMiles,
          source: mutation.data.source,
        }
      : null,
    isLoading: mutation.isPending,
    error: driveTimeError,
    resultKey,
  };
}
