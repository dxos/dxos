//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { useIntegrationProvider } from '../capabilities/integration-provider';
import { type Integration } from '../types';

export type UseSyncIntegrationResult = {
  /** True when the integration's provider exposes a `sync` operation. Drives sync button visibility. */
  readonly available: boolean;
  /** True while a sync is in flight. */
  readonly syncing: boolean;
  /** Most recent error from `sync`, if any. */
  readonly error: string | undefined;
  /**
   * Invokes `provider.sync` for the whole integration (no `kanban` arg).
   * Pops a toast with totals on success or an error message on failure.
   * No-op when `available` is false.
   */
  readonly sync: () => Promise<void>;
};

/**
 * Trigger a full integration sync — calls `provider.sync({ integration })` and
 * surfaces the result via toast. Per-target `lastSyncAt`/`lastError` updates
 * are written by the operation handler and show up reactively in the
 * `IntegrationArticle` surface.
 */
export const useSyncIntegration = (
  integration: Integration.Integration | undefined,
): UseSyncIntegrationResult => {
  const { invokePromise } = useOperationInvoker();
  const [accessToken] = useObject(integration?.accessToken);
  const provider = useIntegrationProvider(accessToken?.source);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string>();

  const sync = useCallback(async () => {
    if (!integration || !provider?.sync) return;
    setSyncing(true);
    setError(undefined);
    try {
      const result = await invokePromise(provider.sync as any, {
        integration: Ref.make(integration),
      });
      if (result.error) {
        throw result.error;
      }
      void invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.sync-success.${integration.id}`,
        icon: 'ph--check--regular',
        title: ['sync-toast.success.label', { ns: meta.id, defaultValue: 'Sync complete' }],
      });
    } catch (err) {
      log.catch(err);
      const message = String((err as Error).message ?? err);
      setError(message);
      void invokePromise(LayoutOperation.AddToast, {
        id: `${meta.id}.sync-error.${integration.id}`,
        icon: 'ph--warning--regular',
        title: ['sync-toast.error.label', { ns: meta.id, defaultValue: 'Sync failed' }],
        description: message,
      });
    } finally {
      setSyncing(false);
    }
  }, [integration, provider, invokePromise]);

  return {
    available: !!provider?.sync,
    syncing,
    error,
    sync,
  };
};
