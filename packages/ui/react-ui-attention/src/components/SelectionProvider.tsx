//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Match } from 'effect';
import React, { useCallback, type PropsWithChildren } from 'react';

import { useDeepCompareMemo, useDefaultValue } from '@dxos/react-ui';

import {
  defaultSelection,
  SelectionManager,
  type SelectionResult,
  type Selection,
  type SelectionMode,
} from '../selection';

const SELECTION_NAME = 'Selection';

type SelectionContextValue = {
  selection: SelectionManager;
};

const [SelectionContextProvider, useSelectionContext] = createContext<SelectionContextValue>(SELECTION_NAME, {
  selection: new SelectionManager(),
});

/**
 * Manages selection state across the app for multiple contexts.
 */
// TODO(burdon): When is the selection removed?
export const SelectionProvider = ({
  children,
  selection: propsSelection,
}: PropsWithChildren<{ selection?: SelectionManager }>) => {
  const selection = useDefaultValue(propsSelection, () => new SelectionManager());
  return <SelectionContextProvider selection={selection}>{children}</SelectionContextProvider>;
};

/**
 * Get the selection contexts.
 */
export const useSelectionManager = () => {
  const { selection } = useSelectionContext(SELECTION_NAME);
  return selection;
};

/**
 * Get the selected objects for a given context.
 */
export const useSelected = <T extends SelectionMode>(
  contextId?: string,
  mode: T = 'multi' as T,
): SelectionResult<T> => {
  const { selection } = useSelectionContext(SELECTION_NAME);
  if (contextId) {
    return selection.getSelected(contextId, mode);
  }

  return Match.type<Selection>().pipe(
    Match.when({ mode: 'single' }, (s) => s.id),
    Match.when({ mode: 'multi' }, (s) => s.ids),
    Match.when({ mode: 'range' }, (s) => (s.from && s.to ? { from: s.from, to: s.to } : undefined)),
    Match.when({ mode: 'multi-range' }, (s) => s.ranges),
    Match.exhaustive,
  )(defaultSelection(mode)) as any;
};

/**
 * Provides functions to manage the selection state for multiple contexts.
 */
export const useSelectionActions = (contextIds: string[], mode: SelectionMode = 'multi') => {
  const stableContextIds = useDeepCompareMemo(() => contextIds, [contextIds]);
  const { selection } = useSelectionContext(SELECTION_NAME);

  const singleSelect = useCallback(
    (id: string) => {
      for (const contextId of stableContextIds) {
        selection.updateSingle(contextId, id);
      }
    },
    [selection, stableContextIds],
  );

  const multiSelect = useCallback(
    (ids: string[]) => {
      for (const contextId of stableContextIds) {
        selection.updateMulti(contextId, ids);
      }
    },
    [selection, stableContextIds],
  );

  const rangeSelect = useCallback(
    (from: string, to: string) => {
      for (const contextId of stableContextIds) {
        selection.updateRange(contextId, from, to);
      }
    },
    [selection, stableContextIds],
  );

  const toggle = useCallback(
    (id: string) => {
      for (const contextId of stableContextIds) {
        selection.toggleSelection(contextId, id);
      }
    },
    [selection, stableContextIds],
  );

  const clear = useCallback(() => {
    for (const contextId of stableContextIds) {
      selection.clearSelection(contextId);
    }
  }, [selection, stableContextIds]);

  return { singleSelect, multiSelect, rangeSelect, toggle, clear };
};
