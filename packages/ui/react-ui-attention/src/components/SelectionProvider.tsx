//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import * as Match from 'effect/Match';
import React, { type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useDefaultValue } from '@dxos/react-hooks';

import {
  type Selection,
  SelectionManager,
  type SelectionMode,
  type SelectionResult,
  defaultSelection,
} from '../selection';

const SELECTION_NAME = 'Selection';

type SelectionContextValue = {
  selection: SelectionManager;
};

const [SelectionContextProvider, useSelectionContext] = createContext<SelectionContextValue>(SELECTION_NAME, {
  selection: undefined as unknown as SelectionManager,
});

/**
 * Manages selection state across the app for multiple contexts.
 */
// TODO(burdon): When is the selection removed?
export const SelectionProvider = ({
  children,
  selection: propsSelection,
}: PropsWithChildren<{ selection?: SelectionManager }>) => {
  const registry = useContext(RegistryContext);
  const selection = useDefaultValue(propsSelection, () => new SelectionManager(registry));
  return <SelectionContextProvider selection={selection}>{children}</SelectionContextProvider>;
};

/**
 * Get the selection contexts.
 */
export const useSelectionManager = () => {
  const { selection } = useSelectionContext(SELECTION_NAME);
  return selection;
};

const getDefaultResult = <T extends SelectionMode>(mode: T): SelectionResult<T> => {
  return Match.type<Selection>().pipe(
    Match.when({ mode: 'single' }, (selection) => selection.id),
    Match.when({ mode: 'multi' }, (selection) => selection.ids),
    Match.when({ mode: 'range' }, (selection) =>
      selection.from && selection.to ? { from: selection.from, to: selection.to } : undefined,
    ),
    Match.when({ mode: 'multi-range' }, (selection) => selection.ranges),
    Match.exhaustive,
  )(defaultSelection(mode)) as SelectionResult<T>;
};

/**
 * Get the selected objects for a given context.
 */
export const useSelected = <T extends SelectionMode>(
  contextId?: string,
  mode: T = 'multi' as T,
): SelectionResult<T> => {
  const { selection } = useSelectionContext(SELECTION_NAME);
  const [state, setState] = useState<SelectionResult<T>>(() =>
    contextId && selection ? selection.getSelected(contextId, mode) : getDefaultResult(mode),
  );

  useEffect(() => {
    if (!contextId || !selection) {
      setState(getDefaultResult(mode));
      return;
    }

    // Set initial state.
    setState(selection.getSelected(contextId, mode));

    // Subscribe to changes.
    return selection.subscribe(() => {
      setState(selection.getSelected(contextId, mode));
    });
  }, [selection, contextId, mode]);

  return state;
};

export type UseSelectionActions = {
  singleSelect: (id: string) => void;
  multiSelect: (ids: string[]) => void;
  rangeSelect: (from: string, to: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
};

/**
 * Provides functions to manage the selection state for multiple contexts.
 */
// TODO(burdon): Mode not used.
export const useSelectionActions = (contextIds: string[], mode: SelectionMode = 'multi'): UseSelectionActions => {
  const stableContextIds = useMemo(() => contextIds, [JSON.stringify(contextIds)]); // TODO(burdon): Avoid stringify.
  const { selection } = useSelectionContext(SELECTION_NAME);

  const singleSelect = useCallback(
    (id: string) => {
      if (!selection) {
        return;
      }
      for (const contextId of stableContextIds) {
        selection.updateSingle(contextId, id);
      }
    },
    [selection, stableContextIds],
  );

  const multiSelect = useCallback(
    (ids: string[]) => {
      if (!selection) {
        return;
      }
      for (const contextId of stableContextIds) {
        selection.updateMulti(contextId, ids);
      }
    },
    [selection, stableContextIds],
  );

  const rangeSelect = useCallback(
    (from: string, to: string) => {
      if (!selection) {
        return;
      }
      for (const contextId of stableContextIds) {
        selection.updateRange(contextId, from, to);
      }
    },
    [selection, stableContextIds],
  );

  const toggle = useCallback(
    (id: string) => {
      if (!selection) {
        return;
      }
      for (const contextId of stableContextIds) {
        selection.toggleSelection(contextId, id);
      }
    },
    [selection, stableContextIds],
  );

  const clear = useCallback(() => {
    if (!selection) {
      return;
    }
    for (const contextId of stableContextIds) {
      selection.clearSelection(contextId);
    }
  }, [selection, stableContextIds]);

  return { singleSelect, multiSelect, rangeSelect, toggle, clear };
};
