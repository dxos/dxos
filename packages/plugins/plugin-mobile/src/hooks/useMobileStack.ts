//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as DeckSchema from '@dxos/plugin-deck/DeckSchema';
import { useDeckState } from '@dxos/plugin-deck/hooks';

export type MobileStack = {
  /** Panel ids, root (workspace list panel) first; the visible panel is last. */
  stack: string[];
  /** The visible panel. */
  topId: string;
  /** The stack's root panel: the workspace, or the app root when no workspace is active. */
  rootId: string;
  /** Navigate back: close the top panel, or return to the workspace list from a workspace root. */
  pop: () => void;
};

/**
 * Projects the active deck as a mobile navigation stack: `active` is the stack (top = last), the
 * workspace itself is the root panel beneath it, so back is Close until the stack is empty and
 * SwitchWorkspace(root) from there — the same operations every other surface uses.
 */
export const useMobileStack = (): MobileStack => {
  const { state, deck } = useDeckState();
  const { invokePromise } = useOperationInvoker();

  const rootId = state.activeDeck === DeckSchema.DEFAULT_DECK_ID ? GraphNode.RootId : state.activeDeck;
  const stack = useMemo(() => [rootId, ...deck.active], [rootId, deck.active]);
  const topId = stack[stack.length - 1] ?? rootId;

  const pop = useCallback(() => {
    const top = deck.active[deck.active.length - 1];
    if (top) {
      void invokePromise(LayoutOperation.Close, { subject: [top] });
    } else if (rootId !== GraphNode.RootId) {
      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphNode.RootId });
    }
  }, [invokePromise, deck.active, rootId]);

  return { stack, topId, rootId, pop };
};
