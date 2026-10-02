//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';

import * as LayoutOperation from '../../operations/LayoutOperation.ts';

export type DetailNavigationOptions = {
  /** The list's own plank: the attention context its selection is published in, and the detail's pivot. */
  contextId: string;
  /** Path of the item's own node, which the detail shows. */
  getPath: (id: string) => string;
};

export type DetailActivation = {
  /** A modified activation asks for a plank of its own, leaving the list's detail in place. */
  modified?: boolean;
};

/**
 * Opens the detail of a row in a list: publishes the row as the list's selection (which keeps it
 * current) and opens the row's node as the list plank's detail. The layout decides where a detail
 * goes; the list only says that it is one.
 *
 * Passing `undefined` clears the selection: a list that reads its current row back from the host
 * would otherwise keep the last row highlighted with nothing open.
 */
export const useDetailNavigation = ({ contextId, getPath }: DetailNavigationOptions) => {
  const { invokePromise } = Hooks.useOperationInvoker();

  return useCallback(
    (id: string | undefined, { modified = false }: DetailActivation = {}) => {
      if (!id) {
        void invokePromise(LayoutOperation.Select, { contextId, subject: { mode: 'single' } });
        return;
      }

      void invokePromise(LayoutOperation.Select, { contextId, subject: { mode: 'single', id } });
      void invokePromise(LayoutOperation.Open, {
        subject: [getPath(id)],
        pivotId: contextId,
        disposition: modified ? 'add' : 'detail',
        navigation: 'immediate',
      });
    },
    [contextId, getPath, invokePromise],
  );
};
