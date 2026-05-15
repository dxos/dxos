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
 * adds the UX safeguard. Surfaces call {@link requestDisable} with a plugin id
 * and a `dispatch` callback that performs the actual disable (allowing each
 * surface to wrap the call with its own observability / side effects). When
 * the target has enabled dependents the prompt opens and the dispatch is
 * deferred until {@link confirmDisable}; otherwise dispatch runs immediately.
 *
 * The returned `state` exposes the dependent ids (not display names) so the
 * caller can resolve them at render time via {@link usePluginName}.
 */
export const useDisableConfirmation = (manager: PluginManager.PluginManager) => {
  const [state, setState] = useState<DisableConfirmationState>(() => closedState);

  const close = useCallback(() => setState(closedState), []);

  const requestDisable = useCallback(
    (pluginId: string, dispatch: (id: string) => void): void => {
      const enabledDependents = manager.getDependents(pluginId, { transitive: true, enabledOnly: true });
      if (enabledDependents.length === 0) {
        dispatch(pluginId);
        return;
      }
      setState({ open: true, pluginId, dependents: enabledDependents });
    },
    [manager],
  );

  const confirmDisable = useCallback(
    (dispatch: (id: string) => void): void => {
      const id = state.pluginId;
      setState(closedState);
      if (id) {
        dispatch(id);
      }
    },
    [state.pluginId],
  );

  return { state, close, requestDisable, confirmDisable };
};
