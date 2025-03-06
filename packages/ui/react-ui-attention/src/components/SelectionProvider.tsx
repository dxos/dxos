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

export const useSelectionActions = (contextId?: string) => {
  const { selection } = useSelectionContext(SELECTION_NAME);

  const select = useCallback(
    (ids: string[]) => {
      if (!contextId) {
        return new Set();
      }
      selection.updateSelection(contextId, ids);
    },
    [selection, contextId],
  );

  const toggle = useCallback(
    (id: string) => {
      if (!contextId) {
        return new Set();
      }
      selection.toggleSelection(contextId, id);
    },
    [selection, contextId],
  );

  const clear = useCallback(() => {
    if (!contextId) {
      return;
    }
    selection.clearSelection(contextId);
  }, [selection, contextId]);

  return { select, toggle, clear };
};
