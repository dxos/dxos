//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AttentionSigilAction } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, Node, useActionRunner, useActions, useNode } from '@dxos/plugin-graph';

import { useBreakpoints, useCompanions, useDeckState } from '#hooks';
import { meta } from '#meta';
import { DeckOperation, type ResolvedPart } from '#types';

/** Sigil-menu dispositions surfaced as plank actions. */
const PLANK_ACTION_DISPOSITIONS = ['list-item', 'list-item-primary', 'heading-list-item'];

/** Capability flags that gate the plank toolbar controls. */
export type PlankCapabilities = {
  /** Eligible for the fullscreen toggle (a main, non-mobile plank). */
  fullscreenToggle?: boolean;
  incrementStart?: boolean;
  incrementEnd?: boolean;
  /** Eligible to open the deck companion (offered on the last plank when the companion is off). */
  companion?: boolean;
};

export type UseDeckPlankOptions = {
  id: string;
  /** Resolved part for the primary plank (`main` | `complementary`). */
  part: ResolvedPart;
  /** Whether the deck currently shows a single active plank (fullbleed look). */
  soloLook: boolean;
  /** Ordered active planks (multi mode); enables the increment affordances. */
  active?: string[];
};

export type DeckPlank = {
  node: Node.Node | undefined;
  capabilities: PlankCapabilities;
  /** Grouped sigil-menu actions, or `undefined` when the node is unresolved. */
  sigilActions: AttentionSigilAction[][] | undefined;
  popoverAnchorId?: string;
  scrollIntoView?: string;
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
export const useDeckPlank = ({ id, part, soloLook, active }: UseDeckPlankOptions): DeckPlank => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const { deck, state } = useDeckState();
  const runAction = useActionRunner();
  const breakpoint = useBreakpoints();
  const node = useNode(graph, id);
  // Subscribe reactively to the node's actions: they are loaded asynchronously by `Graph.expand`
  // below, and the node atom does not re-emit when action edges arrive, so a one-shot read would
  // leave a freshly-created plank's sigil menu empty until an unrelated re-render.
  const actions = useActions(graph, node?.id);
  const companions = useCompanions(id);

  // Ordering within the active stack drives the increment-start/end affordances.
  const index = active ? active.findIndex((entryId) => entryId === id) : -1;
  const isOrdered = !!active && index >= 0;
  const canIncrementStart = isOrdered && index > 0;
  const canIncrementEnd = isOrdered && index < (active?.length ?? 1) - 1;
  const isLastPlank = !active || index === active.length - 1;

  const capabilities = useMemo<PlankCapabilities>(
    () => ({
      fullscreenToggle: breakpoint !== 'mobile' && part === 'main',
      incrementStart: canIncrementStart,
      incrementEnd: canIncrementEnd,
      // The deck companion is a whole-deck toggle attached to the last plank: offer it on the last
      // plank when a companion exists there and the companion is not already open.
      companion: companions.length > 0 && !deck.companionOpen && isLastPlank,
    }),
    [breakpoint, part, canIncrementStart, canIncrementEnd, companions.length, deck.companionOpen, isLastPlank],
  );

  // Load the node's child actions so the sigil menu is populated.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (node) {
        void Graph.expand(graph, node.id, 'child');
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [graph, node]);

  const sigilActions = useMemo<AttentionSigilAction[][] | undefined>(() => {
    if (!node) {
      return undefined;
    }

    return [actions.filter((action) => Node.hasDisposition(action, PLANK_ACTION_DISPOSITIONS))].filter(
      (group) => group.length > 0,
    );
  }, [actions, node]);

  const onAction = useCallback(
    (action: AttentionSigilAction) => {
      // Only actions whose `data` is a function are runnable graph actions; the menu-action view type
      // (AttentionSigilAction) is widened, so narrow at this runtime-checked boundary.
      if (typeof action.data === 'function') {
        void runAction(action as Node.Action, { parent: node, caller: meta.profile.key });
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
    capabilities,
    sigilActions,
    popoverAnchorId: state.popoverAnchorId,
    scrollIntoView: state.scrollIntoView,
    onAction,
    onAdjust,
    onResize,
    onScrollIntoView,
  };
};
