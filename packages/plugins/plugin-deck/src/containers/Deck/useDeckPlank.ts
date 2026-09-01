//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import { type AttentionSigilAction } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useActionRunner, useActions, useNode } from '@dxos/plugin-graph/hooks';

import { useBreakpoints, useCompanions, useDeckSettings, useDeckState } from '#hooks';
import { meta } from '#meta';
import { DeckOperation, DeckSchema } from '#types';

import { isCompanionOpen } from '../../util/index.ts';

/** Sigil-menu dispositions surfaced as plank actions. */
const PLANK_ACTION_DISPOSITIONS = ['list-item', 'list-item-primary', 'heading-list-item'];

/** Capability flags that gate the plank toolbar controls. */
export type PlankCapabilities = {
  /** Eligible for the fullscreen toggle (a main, non-mobile plank). */
  fullscreenToggle?: boolean;
  /** Eligible for the expand toggle (a main, non-mobile plank in a deck with something to expand into). */
  expandToggle?: boolean;
  incrementStart?: boolean;
  incrementEnd?: boolean;
  /** Eligible to open the deck companion (offered on any plank that has one, when the companion is off). */
  companion?: boolean;
};

export type UseDeckPlankOptions = {
  id: string;
  /** Resolved part for the primary plank (`main` | `complementary`). */
  part: DeckSchema.ResolvedPart;
  /** Ordered active planks (multi mode); enables the increment affordances. */
  active?: string[];
};

export type DeckPlank = {
  node: AppGraphNode.Node | undefined;
  /** Whether a URL restore gave up on this plank; distinguishes "gave up" from "still loading". */
  unresolved: boolean;
  /** The not-found sentinel's node, so an unresolved plank can borrow its label and icon. */
  notFoundNode: AppGraphNode.Node | undefined;
  capabilities: PlankCapabilities;
  /** Grouped sigil-menu actions, or `undefined` when the node is unresolved. */
  sigilActions: AttentionSigilAction[][] | undefined;
  popoverAnchorId?: string;
  scrollIntoView?: string;
  /** Whether this plank is the one currently expanded to fill the deck. */
  expanded: boolean;
  onAction: (action: AttentionSigilAction) => void;
  onAdjust: (type: DeckOperation.PartAdjustment) => void;
  onResize: (size: number) => void;
  onScrollIntoView: (subject?: string) => void;
};

/**
 * Resolves the graph node, capabilities and sigil actions for a deck plank, and exposes the operation
 * dispatchers that mutate deck layout state. Companions are rendered as their own planks
 * ({@link CompanionPlank}), so this hook only handles ordinary content planks.
 */
export const useDeckPlank = ({ id, part, active }: UseDeckPlankOptions): DeckPlank => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const { deck, state } = useDeckState();
  const { flatten } = useDeckSettings();
  const runAction = useActionRunner();
  const breakpoint = useBreakpoints();
  const node = useNode(graph, id);
  // Subscribe reactively to the node's actions: they are loaded asynchronously by `AppGraph.expand`
  // below, and the node atom does not re-emit when action edges arrive, so a one-shot read would
  // leave a freshly-created plank's sigil menu empty until an unrelated re-render.
  const actions = useActions(graph, node?.id);
  const companions = useCompanions(id);
  const notFoundNode = useNode(graph, NotFound.NOT_FOUND_PATH);
  // Keyed by id, not a boolean: call sites render planks unkeyed, so a swapped id reuses this
  // instance and a plain latch would carry the previous plank's verdict onto the new one.
  const resolvedOnce = useRef<string | undefined>(undefined);
  if (node) {
    resolvedOnce.current = id;
  }

  // Ordering within the active stack drives the increment-start/end affordances.
  const index = active ? active.findIndex((entryId) => entryId === id) : -1;
  const isOrdered = !!active && index >= 0;
  const canIncrementStart = isOrdered && index > 0;
  const canIncrementEnd = isOrdered && index < (active?.length ?? 1) - 1;

  const capabilities = useMemo<PlankCapabilities>(
    () => ({
      fullscreenToggle: breakpoint !== 'mobile' && part === 'main',
      // Only worth offering while the deck slides: a lone plank already fills the viewport.
      expandToggle: breakpoint !== 'mobile' && part === 'main' && (active?.length ?? 0) > 1,
      incrementStart: canIncrementStart,
      incrementEnd: canIncrementEnd,
      // Offered on any plank that has a companion while the companion is off — deck-wide in flat mode,
      // per-plank while the deck slides.
      companion: companions.length > 0 && !isCompanionOpen(deck.companionPlanks, flatten, id),
    }),
    [
      breakpoint,
      part,
      canIncrementStart,
      canIncrementEnd,
      companions.length,
      deck.companionPlanks,
      flatten,
      id,
      active?.length,
    ],
  );

  // Load the node's child actions so the sigil menu is populated.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (node) {
        void AppGraph.expandSync(graph, node.id, 'child');
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [graph, node]);

  const sigilActions = useMemo<AttentionSigilAction[][] | undefined>(() => {
    if (!node) {
      return undefined;
    }

    return [actions.filter((action) => AppGraphNode.hasDisposition(action, PLANK_ACTION_DISPOSITIONS))].filter(
      (group) => group.length > 0,
    );
  }, [actions, node]);

  const onAction = useCallback(
    (action: AttentionSigilAction) => {
      // Only actions whose `data` is a function are runnable graph actions; the menu-action view type
      // (AttentionSigilAction) is widened, so narrow at this runtime-checked boundary.
      if (typeof action.data === 'function') {
        void runAction(action as AppGraphNode.Action, { parent: node, caller: meta.profile.key });
      }
    },
    [node, runAction],
  );

  const onAdjust = useCallback(
    (type: DeckOperation.PartAdjustment) => {
      if (type === 'close') {
        if (part === 'complementary') {
          return invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        }
        // Close only this plank — desktop decks are not dependency chains, so no cascade.
        return invokePromise(LayoutOperation.Close, { subject: [id] });
      }

      return invokePromise(DeckOperation.Adjust, { type, id });
    },
    [invokePromise, part, id],
  );

  const onResize = useCallback(
    (size: number) => invokePromise(DeckOperation.UpdatePlankSize, { id, size }),
    [invokePromise, id],
  );

  const onScrollIntoView = useCallback(
    (subject?: string) => invokePromise(LayoutOperation.ScrollIntoView, { subject }),
    [invokePromise],
  );

  return {
    node,
    // Latched on first sight of the node: a plank that healed is no longer unresolved, so a later
    // graph gap shows loading rather than resurrecting the restore's verdict.
    unresolved: !node && resolvedOnce.current !== id && !!state.unresolved?.includes(id),
    notFoundNode,
    capabilities,
    sigilActions,
    popoverAnchorId: state.popoverAnchorId,
    scrollIntoView: state.scrollIntoView,
    expanded: state.expanded === id,
    onAction,
    onAdjust,
    onResize,
    onScrollIntoView,
  };
};
