//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { Context } from '@dxos/context';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { log } from '@dxos/log';
import { type PluginEntry } from '@dxos/protocols';
import { useEdgeClient } from '@dxos/react-edge-client';

export type CommunityPluginsState = {
  entries: readonly PluginEntry[];
  loading: boolean;
  error: Error | null;
};

/**
 * Session-level cache keyed by Edge base URL. One fetch per page load, shared across every
 * surface that asks. Reset via {@link resetCommunityPluginsCache} (tests).
 */
const cachedByBaseUrl = new Map<string, Promise<readonly PluginEntry[]>>();

export const resetCommunityPluginsCache = (): void => {
  cachedByBaseUrl.clear();
};

/**
 * Fetches the community plugin registry once per session and returns the cached promise
 * on subsequent calls. Available to both React hooks and non-React callers
 * (e.g., graph builders) that already have an {@link EdgeHttpClient}.
 */
export const loadCommunityPluginsOnce = (client: EdgeHttpClient): Promise<readonly PluginEntry[]> => {
  const baseUrl = client.baseUrl;
  const existing = cachedByBaseUrl.get(baseUrl);
  if (existing) {
    return existing;
  }
  const promise = client
    .getRegistryPlugins(Context.default())
    .then((body) => body.plugins.filter((entry) => entry.health === 'ok'))
    .catch((error: unknown) => {
      cachedByBaseUrl.delete(baseUrl);
      throw error;
    });
  cachedByBaseUrl.set(baseUrl, promise);
  return promise;
};

/**
 * Fetches the community plugin registry once per session from the Edge registry service
 * and returns the hydrated, healthy entries. The cache is shared across every surface that
 * calls this hook so the Official/Recommended filters, the Community surface, and the
 * auto-tags map all hit Edge exactly once.
 */
export const useCommunityPlugins = (): CommunityPluginsState => {
  const edgeClient = useEdgeClient();
  const [state, setState] = useState<CommunityPluginsState>({ entries: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    loadCommunityPluginsOnce(edgeClient)
      .then((entries) => {
        if (!cancelled) {
          setState({ entries, loading: false, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          log.catch(normalized);
          setState({ entries: [], loading: false, error: normalized });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [edgeClient]);

  return state;
};
