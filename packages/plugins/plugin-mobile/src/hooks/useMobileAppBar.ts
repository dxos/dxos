//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import * as GraphNode from '@dxos/graph/GraphNode';
import { invariant } from '@dxos/invariant';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import * as DeckSchema from '@dxos/plugin-deck/DeckSchema';
import { useDeckState } from '@dxos/plugin-deck/hooks';
import { useActionRunner, useNode } from '@dxos/plugin-graph/hooks';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type ActionExecutor, type ActionGraphProps, graphActions } from '@dxos/react-ui-menu';

import { meta } from '#meta';

import { useMobileStack } from './useMobileStack.ts';

export type MobileAppBar = {
  /** Title of the visible panel. */
  title?: string;
  /** Action graph atom for the dropdown menu. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Whether to show the back button. */
  showBackButton: boolean;
  /** Popover anchor ID for the dropdown trigger. */
  popoverAnchorId?: string;
  /** Navigate back one level in the mobile stack. */
  onBack: () => void;
  /** Action executor callback. */
  onAction: ActionExecutor;
};

const ACTION_DISPOSITIONS = ['list-item', 'list-item-primary', 'heading-list-item'];

/**
 * App bar state for the mobile layout: title, dropdown actions, and back button track the top of the
 * stack (see {@link useMobileStack}) rather than the attended plank, since a stack shows one plank
 * at a time and the app bar is chrome for that one.
 */
export const useMobileAppBar = (): MobileAppBar => {
  const { t } = useTranslation(meta.profile.key);
  const { state } = useDeckState();
  const stateAtom = useCapability(DeckCapabilities.State);
  const { graph } = useAppGraph();
  const { stack, topId, rootId, pop } = useMobileStack();
  const runAction = useActionRunner();

  const node = useNode(graph, topId);
  const title = node ? toLocalizedString(node.properties.label, t) : undefined;

  // Derives activeId from the state atom (rather than `useMobileStack`) so this atom does not need
  // to be recreated on every stack change; an atom body cannot call a hook, so the root fallback is
  // mirrored inline here.
  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        const state = get(stateAtom);
        const deck = state.decks[state.activeDeck];
        invariant(deck, `Deck not found: ${state.activeDeck}`);
        const activeId =
          deck.active[deck.active.length - 1] ??
          (state.activeDeck === DeckSchema.DEFAULT_DECK_ID ? GraphNode.RootId : state.activeDeck);
        // `graphActions` returns typed `ActionGraphProps` directly, so no cast is needed to bridge
        // `@dxos/app-graph`'s `AppGraphNode.ActionLike[]` into `@dxos/react-ui-menu`'s node/edge shape.
        return graphActions(graph, get, activeId, {
          filter: (action) => ACTION_DISPOSITIONS.includes(action.properties.disposition),
        });
      }),
    [graph, stateAtom],
  );

  const showBackButton = stack.length > 1 || rootId !== GraphNode.RootId;
  const onBack = useCallback(() => pop(), [pop]);

  // `Menu` would hand the action its menu group as `parent`, but the graph extensions compose a
  // popover's anchor id as `caller:parent.id` — so without the panel's own node the rename popover
  // anchors to nothing and Radix parks it off-screen. Matches how the desktop plank invokes.
  const onAction = useCallback<ActionExecutor>(
    (action, params) => runAction(action, { ...params, parent: node }),
    [runAction, node],
  );

  const popoverAnchorId =
    node && state.popoverAnchorId === `${meta.profile.key}:${node.id}` ? state.popoverAnchorId : undefined;

  return {
    title,
    actions: actionsAtom,
    showBackButton,
    popoverAnchorId,
    onBack,
    onAction,
  };
};
