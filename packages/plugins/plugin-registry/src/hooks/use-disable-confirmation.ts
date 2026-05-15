//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type PluginManager } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useTranslation } from '@dxos/react-ui';

import { DISABLE_DEPENDENTS_DIALOG } from '#meta';

/**
 * Returns `requestDisable(pluginId)` that gates `manager.disable` on a
 * confirmation prompt when the target has currently-enabled dependents.
 *
 * `PluginManager.disable` cascades by default; this hook is the UX safeguard
 * around that. The caller supplies a `dispatch` callback that performs the
 * actual disable (wrapping it with observability or any other side effects).
 * When there are no enabled dependents, dispatch runs immediately; otherwise
 * we open the shared {@link DISABLE_DEPENDENTS_DIALOG} surface — its
 * `onConfirm` runs the dispatch and closes the dialog.
 */
export const useDisableConfirmation = (manager: PluginManager.PluginManager, dispatch: (id: string) => void) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation();

  return useCallback(
    (pluginId: string): void => {
      const enabledDependents = manager.getDependents(pluginId, { transitive: true, enabledOnly: true });
      if (enabledDependents.length === 0) {
        dispatch(pluginId);
        return;
      }
      void invokePromise(LayoutOperation.UpdateDialog, {
        subject: DISABLE_DEPENDENTS_DIALOG,
        state: true,
        type: 'alert',
        props: {
          pluginName: t('plugin.name', { ns: pluginId, defaultValue: pluginId }),
          dependents: enabledDependents.map((id) => ({
            id,
            name: t('plugin.name', { ns: id, defaultValue: id }),
          })),
          onConfirm: () => {
            dispatch(pluginId);
            void invokePromise(LayoutOperation.UpdateDialog, { state: false });
          },
        },
      });
    },
    [manager, dispatch, invokePromise, t],
  );
};
