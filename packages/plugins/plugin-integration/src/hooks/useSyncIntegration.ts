//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { useIntegrationProviderById } from '../capabilities/integration-provider';
import { type Integration } from '../types';

export type UseSyncIntegrationResult = {
  /** True when the integration's provider exposes a `sync` operation. Drives sync button visibility. */
  readonly available: boolean;
  /** True while a sync is in flight. */
  readonly syncing: boolean;
  /**
   * Invokes `provider.sync` for the whole integration (no `kanban` arg).
   * Pops a toast with totals on success or an error message on failure.
   * No-op when `available` is false.
   */
  readonly sync: () => Promise<void>;
};

/**
 * Trigger a full integration sync — calls `provider.sync({ integration })` and
 * tracks in-flight / error state. Toasts are emitted by the sync operation
 * itself so every caller (this hook, graph actions, scheduled triggers, …)
 * gets the same user feedback. Per-target `lastSyncAt`/`lastError` updates
 * are written by the operation handler and show up reactively in the
 * `IntegrationArticle` surface.
 */
export const useSyncIntegration = (
  integration: Integration.Integration | undefined,
): UseSyncIntegrationResult => {
  const { invokePromise } = useOperationInvoker();
  const provider = useIntegrationProviderById(integration?.providerId);
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!integration || !provider?.sync) return;
    setSyncing(true);
    try {
      const result = await invokePromise(provider.sync as any, {
        integration: Ref.make(integration),
      });
      if (result.error) {
        throw result.error;
      }
    } catch (err) {
      log.catch(err);
    } finally {
      setSyncing(false);
    }
  }, [integration, provider, invokePromise]);

  return {
    available: !!provider?.sync,
    syncing,
    sync,
  };
};
