//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { useDefaultValue } from '@dxos/react-hooks';

import {
  type SelectionMode,
  type SelectionResult,
  resolveSelection,
  selectionSlice,
  toggleSelection,
} from '../../selection';
import { type SliceDef, ViewStateManager, createDefaultBackends } from '../../view-state';

const VIEW_STATE_NAME = 'ViewState';

type ViewStateContextValue = { manager?: ViewStateManager };

// Default value lets consumers render outside a provider (isolated stories/tests) without throwing;
// `manager` reads as `undefined` and hooks fall back to slice defaults / no-op actions.
const [ViewStateContextProvider, useViewStateContext] = createContext<ViewStateContextValue>(VIEW_STATE_NAME, {
  manager: undefined,
});

/** Provides the per-context UI state manager. Replaces the former `SelectionProvider`. */
export const ViewStateProvider = ({
  children,
  manager: managerProp,
}: PropsWithChildren<{ manager?: ViewStateManager }>) => {
  const registry = useContext(RegistryContext);
  const manager = useDefaultValue(
    managerProp,
    () => new ViewStateManager({ registry, backends: createDefaultBackends(registry) }),
  );
  return <ViewStateContextProvider manager={manager}>{children}</ViewStateContextProvider>;
};

/** Access the underlying ViewStateManager from context. Throws when used outside a `ViewStateProvider`. */
export const useViewStateManager = (): ViewStateManager => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  invariant(manager, 'useViewStateManager() requires a ViewStateProvider ancestor.');
  return manager;
};

/** Reactive read of a slice value for a context; yields the slice default when unset or unprovided. */
export const useViewState = <T,>(slice: SliceDef<T>, contextId?: string): T => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  const [value, setValue] = useState<T>(() =>
    contextId && manager ? manager.get(slice, contextId) : slice.defaultValue(),
  );
  useEffect(() => {
    if (!contextId || !manager) {
      setValue(slice.defaultValue());
      return;
    }
    setValue(manager.get(slice, contextId));
    return manager.subscribe(slice, contextId, setValue);
  }, [manager, slice, contextId]);
  return value;
};

export type UseViewStateActions<T> = {
  set: (value: T) => void;
  update: (fn: (prev: T) => T) => void;
  clear: () => void;
};

export const useViewStateActions = <T,>(slice: SliceDef<T>, contextId?: string): UseViewStateActions<T> => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  return useMemo<UseViewStateActions<T>>(
    () => ({
      set: (value) => {
        if (contextId) {
          manager?.set(slice, contextId, value);
        }
      },
      update: (fn) => {
        if (contextId) {
          manager?.update(slice, contextId, fn);
        }
      },
      clear: () => {
        if (contextId) {
          manager?.set(slice, contextId, slice.defaultValue());
        }
      },
    }),
    [manager, slice, contextId],
  );
};

/** Resolved selection value for `contextId` in the requested `mode` (default `multi`). */
export const useSelection = <T extends SelectionMode>(contextId?: string, mode: T = 'multi' as T): SelectionResult<T> =>
  resolveSelection(useViewState(selectionSlice, contextId), mode);

export type UseSelectionActions = {
  single: (id: string) => void;
  multi: (ids: string[]) => void;
  range: (from: string, to: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
};

/** Selection mutators for a single context, built on the generic ViewState actions. */
export const useSelectionActions = (contextId?: string): UseSelectionActions => {
  const { update, clear } = useViewStateActions(selectionSlice, contextId);
  return useMemo<UseSelectionActions>(
    () => ({
      single: (id) => update(() => ({ mode: 'single', id })),
      multi: (ids) => update(() => ({ mode: 'multi', ids: [...ids] })),
      range: (from, to) => update(() => ({ mode: 'range', from, to })),
      toggle: (id) => update((prev) => toggleSelection(prev, id)),
      clear,
    }),
    [update, clear],
  );
};
