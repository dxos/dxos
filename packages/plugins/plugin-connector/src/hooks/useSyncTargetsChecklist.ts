//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { useConnector } from '#hooks';
import { meta } from '#meta';

import { SYNC_TARGETS_DIALOG } from '../constants';
import { type Connection } from '../types';

export type UseSyncTargetsChecklistResult = {
  /** True when the connection's connector exposes `getSyncTargets`. Drives "edit" button visibility. */
  readonly available: boolean;
  /** True while `openChecklist` is awaiting the operation result. */
  readonly loading: boolean;
  /**
   * Fetches the available targets via `connector.getSyncTargets` and opens the
   * dialog through the layout system. No-op when `available` is false.
   */
  readonly openChecklist: () => Promise<void>;
};

/**
 * Shared "open the sync-targets dialog for this connection" trigger. Used by
 * the "Change sync targets" button in the {@link ConnectionArticle} surface.
 *
 * The dialog itself is rendered by the layout system as a Surface — see
 * `react-surface.tsx` and `SYNC_TARGETS_DIALOG`.
 */
export const useSyncTargetsChecklist = (
  connection: Connection.Connection | undefined,
): UseSyncTargetsChecklistResult => {
  const { invokePromise } = useOperationInvoker();
  const connector = useConnector(connection?.connectorId);
  const [loading, setLoading] = useState(false);

  const openChecklist = useCallback(async () => {
    if (!connection || !connector?.getSyncTargets) {
      return;
    }
    setLoading(true);
    try {
      const result = await invokePromise(
        connector.getSyncTargets,
        { connection: Ref.make(connection) },
        { spaceId: Obj.getDatabase(connection)?.spaceId },
      );
      if (result.error) {
        throw result.error;
      }
      const targets = result.data?.targets ?? [];
      void invokePromise(LayoutOperation.UpdateDialog, {
        subject: SYNC_TARGETS_DIALOG,
        state: true,
        props: {
          connection,
          availableTargets: targets,
        },
      });
    } catch (err) {
      log.catch(err);
      void invokePromise(LayoutOperation.AddToast, {
        id: `${meta.profile.key}/get-sync-targets-error`,
        icon: 'ph--warning--regular',
        duration: 5_000,
        title: ['get-sync-targets-error.title', { ns: meta.profile.key }],
        description: String((err as Error).message ?? err),
        closeLabel: ['close.label', { ns: meta.profile.key }],
      });
    } finally {
      setLoading(false);
    }
  }, [connection, connector, invokePromise]);

  return {
    available: !!connector?.getSyncTargets,
    loading,
    openChecklist,
  };
};
