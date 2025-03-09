//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useCallback, type PropsWithChildren } from 'react';
import React from 'react';

import { useDefaultValue } from '@dxos/react-ui';

import { SelectionManager } from '../selection';

const SELECTION_NAME = 'Selection';

type SelectionContextValue = {
  selection: SelectionManager;
};

const [SelectionContextProvider, useSelectionContext] = createContext<SelectionContextValue>(SELECTION_NAME, {
  selection: new SelectionManager(),
});

export const SelectionProvider = ({
  children,
  selection: propsSelection,
}: PropsWithChildren<{ selection?: SelectionManager }>) => {
  const selection = useDefaultValue(propsSelection, () => new SelectionManager());
  return <SelectionContextProvider selection={selection}>{children}</SelectionContextProvider>;
};

export const useSelectedItems = (contextId: string): Set<string> => {
  const { selection } = useSelectionContext(SELECTION_NAME);
  return selection.getSelection(contextId);
};

// TODO(burdon): What is this for?
export const useSelectionActions = (...contextIds: string[]) => {
  const { selection } = useSelectionContext(SELECTION_NAME);

  const select = useCallback(
    (ids: string[]) => {
      if (!contextIds.length) {
        return new Set();
      }

      for (const contextId of contextIds) {
        selection.updateSelection(contextId, ids);
      }
    },
    [selection, contextIds],
  );

  const toggle = useCallback(
    (id: string) => {
      if (!contextIds.length) {
        return new Set();
      }

      for (const contextId of contextIds) {
        selection.toggleSelection(contextId, id);
      }
    },
    [selection, contextIds],
  );

  const clear = useCallback(() => {
    if (!contextIds.length) {
      return;
    }

    for (const contextId of contextIds) {
      selection.clearSelection(contextId);
    }
  }, [selection, contextIds]);

  return { select, toggle, clear };
};
