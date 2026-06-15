//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

/** Snapshot of Discord presence counts surfaced by the discord-presence Edge service. */
export type DiscordPresence = {
  teamOnline: number;
  communityOnline: number;
};

/** Fetches presence counts from the discord-presence Edge service, refreshing every 60 seconds. */
export const useDiscordPresence = (presenceUrl: string | undefined): DiscordPresence | null => {
  const [presence, setPresence] = useState<DiscordPresence | null>(null);

  useEffect(() => {
    if (!presenceUrl) {
      // Clear any leftover snapshot so consumers don't render stale counts
      // after the env-driven URL is removed (e.g. during dev hot reloads).
      setPresence(null);
      return;
    }

    const fetchPresence = async (signal: AbortSignal) => {
      try {
        const response = await fetch(`${presenceUrl}/presence`, { signal });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as DiscordPresence;
        setPresence({ teamOnline: data.teamOnline, communityOnline: data.communityOnline });
      } catch {
        // Non-essential indicator — fail silently.
      }
    };

    const controller = new AbortController();
    void fetchPresence(controller.signal);
    const interval = setInterval(() => void fetchPresence(controller.signal), 60_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [presenceUrl]);

  return presence;
};
