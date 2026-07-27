//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { useDefaultValue } from '@dxos/react-hooks';

import { createDefaultBackends } from '../../core';
import { Selection, ViewState } from '../../types';

const VIEW_STATE_NAME = 'ViewState';

type ViewStateContextValue = { manager?: ViewState.Manager };

// Default value lets consumers render outside a provider (isolated stories/tests) without throwing;
// `manager` reads as `undefined` and hooks fall back to aspect defaults / no-op actions.
const [ViewStateContextProvider, useViewStateContext] = createContext<ViewStateContextValue>(VIEW_STATE_NAME, {
  manager: undefined,
});

/** Provides the per-context UI state manager. Replaces the former `SelectionProvider`. */
export const ViewStateProvider = ({
  children,
  manager: managerProp,
}: PropsWithChildren<{ manager?: ViewState.Manager }>) => {
  const registry = useContext(RegistryContext);
  const manager = useDefaultValue(
    managerProp,
    () => new ViewState.Manager({ registry, backends: createDefaultBackends(registry) }),
  );
  return <ViewStateContextProvider manager={manager}>{children}</ViewStateContextProvider>;
};

/** Access the underlying Manager from context. Throws when used outside a `ViewStateProvider`. */
export const useManager = (): ViewState.Manager => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  invariant(manager, 'useManager() requires a ViewStateProvider ancestor.');
  return manager;
};

/** Access the Manager if a provider is present; `undefined` otherwise (e.g. isolated stories/tests). */
export const useManagerOptional = (): ViewState.Manager | undefined => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  return manager;
};

/** Reactive read of an aspect value for a context; yields the aspect default when unset or unprovided. */
export const useViewState = <T, Encoded = T>(aspect: ViewState.Aspect<T, Encoded>, contextId?: string): T => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  const [value, setValue] = useState<T>(() =>
    contextId && manager ? manager.get(aspect, contextId) : aspect.defaultValue(),
  );
  useEffect(() => {
    if (!contextId || !manager) {
      setValue(aspect.defaultValue());
      return;
    }
    setValue(manager.get(aspect, contextId));
    return manager.subscribe(aspect, contextId, setValue);
  }, [manager, aspect, contextId]);
  return value;
};

export type UseViewStateActions<T> = {
  set: (value: T) => void;
  update: (fn: (prev: T) => T) => void;
  clear: () => void;
};

export const useViewStateActions = <T, Encoded = T>(
  aspect: ViewState.Aspect<T, Encoded>,
  contextId?: string,
): UseViewStateActions<T> => {
  const { manager } = useViewStateContext(VIEW_STATE_NAME);
  return useMemo<UseViewStateActions<T>>(
    () => ({
      set: (value) => {
        if (contextId) {
          manager?.set(aspect, contextId, value);
        }
      },
      update: (fn) => {
        if (contextId) {
          manager?.update(aspect, contextId, fn);
        }
      },
      clear: () => {
        if (contextId) {
          manager?.set(aspect, contextId, aspect.defaultValue());
        }
      },
    }),
    [manager, aspect, contextId],
  );
};

/** Resolved selection value for `contextId` in the requested `mode` (default `multi`). */
export const useSelection = <T extends Selection.SelectionMode>(
  contextId?: string,
  mode: T = 'multi' as T,
): Selection.Result<T> => Selection.resolve(useViewState(Selection.aspect, contextId), mode);

export type UseSelectionActions = {
  single: (id: string) => void;
  multi: (ids: string[]) => void;
  range: (from: string, to: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
};

/** Selection mutators for a single context, built on the generic ViewState actions. */
export const useSelectionActions = (contextId?: string): UseSelectionActions => {
  const { update, clear } = useViewStateActions(Selection.aspect, contextId);
  return useMemo<UseSelectionActions>(
    () => ({
      single: (id) => update(() => ({ mode: 'single', id })),
      multi: (ids) => update(() => ({ mode: 'multi', ids: [...ids] })),
      range: (from, to) => update(() => ({ mode: 'range', from, to })),
      toggle: (id) => update((prev) => Selection.toggle(prev, id)),
      clear,
    }),
    [update, clear],
  );
};
