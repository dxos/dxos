//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';

import { SYNC_TARGETS_DIALOG } from '../constants';
import { type RemoteTarget, useIntegrationProvider } from '../capabilities/integration-provider';
import { type Integration } from '../types';

export type UseSyncTargetsChecklistResult = {
  /** True when the integration's provider exposes `getSyncTargets`. Drives "edit" button visibility. */
  readonly available: boolean;
  /** True while `openChecklist` is awaiting the operation result. */
  readonly loading: boolean;
  /** Most recent error from `openChecklist`, if any. */
  readonly error: string | undefined;
  /**
   * Fetches the available targets via `provider.getSyncTargets` and opens the
   * dialog through the layout system. No-op when `available` is false.
   */
  readonly openChecklist: () => Promise<void>;
};

/**
 * Shared "open the sync-targets dialog for this integration" trigger. Used by:
 *  - The post-OAuth auto-open flow in `TokensContainer`.
 *  - The per-row "edit" affordance in `IntegrationManager`.
 *  - The "Change sync targets" button in the `IntegrationArticle` surface.
 *
 * The dialog itself is rendered by the layout system as a Surface — see
 * `react-surface.tsx` and `SYNC_TARGETS_DIALOG`.
 */
export const useSyncTargetsChecklist = (
  integration: Integration.Integration | undefined,
): UseSyncTargetsChecklistResult => {
  const { invokePromise } = useOperationInvoker();
  const [accessToken] = useObject(integration?.accessToken);
  const provider = useIntegrationProvider(accessToken?.source);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const openChecklist = useCallback(async () => {
    if (!integration || !provider?.getSyncTargets) return;
    setLoading(true);
    setError(undefined);
    try {
      const result = await invokePromise(provider.getSyncTargets as any, {
        integration: Ref.make(integration),
      });
      if (result.error) {
        throw result.error;
      }
      const targets = (result.data as { targets: readonly RemoteTarget[] } | undefined)?.targets ?? [];
      void invokePromise(LayoutOperation.UpdateDialog, {
        subject: SYNC_TARGETS_DIALOG,
        state: true,
        props: {
          integration,
          availableTargets: targets,
        },
      });
    } catch (err) {
      log.catch(err);
      setError(String((err as Error).message ?? err));
    } finally {
      setLoading(false);
    }
  }, [integration, provider, invokePromise]);

  return {
    available: !!provider?.getSyncTargets,
    loading,
    error,
    openChecklist,
  };
};
