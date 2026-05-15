//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { type PluginManager } from '@dxos/app-framework';

export type DisableConfirmationState = {
  open: boolean;
  pluginId: string;
  dependents: readonly string[];
};

const closedState: DisableConfirmationState = { open: false, pluginId: '', dependents: [] };

/**
 * Cascade-confirmation state machine shared by surfaces that toggle plugins.
 *
 * `PluginManager.disable` cascades to enabled dependents by default; this hook
 * adds the UX safeguard. The caller supplies a `dispatch` callback that
 * performs the actual disable (letting each surface wrap the call with its
 * own observability / side effects). When the target has enabled dependents
 * the prompt opens and the dispatch is deferred until {@link confirmDisable};
 * otherwise dispatch runs immediately from {@link requestDisable}.
 *
 * The returned `state` exposes the dependent ids (not display names) so the
 * caller can resolve them at render time.
 */
export const useDisableConfirmation = (manager: PluginManager.PluginManager, dispatch: (id: string) => void) => {
  const [state, setState] = useState<DisableConfirmationState>(() => closedState);

  const close = useCallback(() => setState(closedState), []);

  const requestDisable = useCallback(
    (pluginId: string): void => {
      const enabledDependents = manager.getDependents(pluginId, { transitive: true, enabledOnly: true });
      if (enabledDependents.length === 0) {
        dispatch(pluginId);
        return;
      }
      setState({ open: true, pluginId, dependents: enabledDependents });
    },
    [manager, dispatch],
  );

  const confirmDisable = useCallback((): void => {
    const id = state.pluginId;
    setState(closedState);
    if (id) {
      dispatch(id);
    }
  }, [state.pluginId, dispatch]);

  return { state, close, requestDisable, confirmDisable };
};
