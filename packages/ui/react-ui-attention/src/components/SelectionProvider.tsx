//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { useCallback, useMemo, type PropsWithChildren } from 'react';

import { useDefaultValue } from '@dxos/react-ui';

import { SelectionManager } from '../selection';

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
// TODO(burdon): Review/remove this.
// TODO(burdon): When is the selection removed?
export const SelectionProvider = ({
  children,
  selection: propsSelection,
}: PropsWithChildren<{ selection?: SelectionManager }>) => {
  const selection = useDefaultValue(propsSelection, () => new SelectionManager());
  return <SelectionContextProvider selection={selection}>{children}</SelectionContextProvider>;
};

const emptySet = new Set<string>();

// TODO(burdon): Return array?
export const useSelectedItems = (contextId?: string): Set<string> => {
  const { selection } = useSelectionContext(SELECTION_NAME);
  return contextId ? selection.getSelection(contextId) : emptySet;
};

/**
 * Provides functions to manage the selection state for multiple contexts.
 */
export const useSelectionActions = (contextIds: string[]) => {
  const stableContextIds = useMemo(() => contextIds, [JSON.stringify(contextIds)]);
  const { selection } = useSelectionContext(SELECTION_NAME);

  const select = useCallback(
    (ids: string[]) => {
      for (const contextId of stableContextIds) {
        selection.updateSelection(contextId, ids);
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

  return { select, toggle, clear };
};
