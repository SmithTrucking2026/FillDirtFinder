import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useGetSettings, getGetSettingsQueryKey, useListPits, getListPitsQueryKey } from "@workspace/api-client-react";
import { X, Settings2, Database } from "lucide-react";
import { useCurrentUser } from "@/contexts/current-user";

interface PortalBannerProps {
  variant?: 'full' | 'slim';
}

export function PortalBanner({ variant = 'full' }: PortalBannerProps) {
  const { currentUser } = useCurrentUser();
  const [dismissed, setDismissed] = useState(false);

  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { data: pits = [] } = useListPits({ query: { queryKey: getListPitsQueryKey() } });

  if (dismissed || !settings || pits.length === 0) return null;

  const latestPit = [...pits].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  if (variant === 'slim') {
    return (
      <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            <span>Rates set by <span className="font-medium text-foreground">{settings.updatedBy}</span> {formatDistanceToNow(new Date(settings.updatedAt), { addSuffix: true })}</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border"></div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="w-4 h-4" />
            <span>{pits.length} pits • Last updated by <span className="font-medium text-foreground">{latestPit.updatedBy}</span> {formatDistanceToNow(new Date(latestPit.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card border-b border-border p-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
      <div className="container mx-auto flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            Welcome back, {currentUser}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <span>Global rates last set by <span className="font-medium text-foreground">{settings.updatedBy}</span> • {formatDistanceToNow(new Date(settings.updatedAt), { addSuffix: true })}</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-border"></div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-accent-foreground" />
              <span>Pit prices: {pits.length} pits • most recent update by <span className="font-medium text-foreground">{latestPit.updatedBy}</span> {formatDistanceToNow(new Date(latestPit.updatedAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
