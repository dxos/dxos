//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AttentionSigilAction } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, Node, useActionRunner, useActions, useNode } from '@dxos/plugin-graph';
import { Attention, useAttention } from '@dxos/react-ui-attention';

import {
  useBreadcrumbs,
  useBreakpoints,
  useCompanions,
  useDeckState,
  useSelectedCompanion,
  useSelectedCompanionVariant,
} from '#hooks';
import { meta } from '#meta';
import { DeckOperation, type LayoutMode, PLANK_COMPANION_TYPE, type ResolvedPart } from '#types';

/** Sigil-menu dispositions surfaced as plank actions. */
const PLANK_ACTION_DISPOSITIONS = ['list-item', 'list-item-primary', 'heading-list-item'];

/** Capability flags that gate the plank toolbar controls. */
export type PlankCapabilities = {
  deck?: boolean;
  solo?: boolean;
  incrementStart?: boolean;
  incrementEnd?: boolean;
  fullscreen?: boolean;
  companion?: boolean;
};

export type UseDeckPlankOptions = {
  id: string;
  /** Resolved part for the primary plank (`solo` | `multi` | `complementary`). */
  part: ResolvedPart;
  layoutMode: LayoutMode;
  /** Ordered active planks (multi mode); enables increment/close-range semantics. */
  active?: string[];
  /** Whether the companion pane should be shown for this plank (gated further by attention in multi-mode). */
  companionShown?: boolean;
  deckEnabled?: boolean;
};

export type DeckPlank = {
  node: Node.Node | undefined;
  /** Ancestor chain (outermost → leaf) for the plank's toolbar breadcrumbs. */
  breadcrumbs: Node.Node[];
  companions: Node.Node[];
  resolvedCompanionId: string | undefined;
  currentCompanion: Node.Node | undefined;
  hasCompanion: boolean;
  /** Splitter orientation for the companion pane (defaults to `horizontal`). */
  companionOrientation: 'horizontal' | 'vertical';
  capabilities: PlankCapabilities;
  /** Grouped sigil-menu actions, or `undefined` when the node is unresolved. */
  sigilActions: AttentionSigilAction[][] | undefined;
  popoverAnchorId?: string;
  scrollIntoView?: string;
  onAction: (action: AttentionSigilAction) => void;
  /** Navigate to an ancestor breadcrumb, opening it in the main content area. */
  onNavigate: (id: string) => void;
  onAdjust: (type: DeckOperation.PartAdjustment) => void;
  onResize: (size: number) => void;
  onScrollIntoView: (subject?: string) => void;
  onUpdateCompanion: (companion: string | null) => void;
};

/**
 * Resolves the graph node, companions, capabilities and sigil actions for a deck plank, and exposes the
 * operation dispatchers that mutate deck layout state. This re-homes the framework wiring that the legacy
 * `PlankContainer`/`PlankHeading` bundled, so the presentational components stay free of capabilities.
 */
export const useDeckPlank = ({
  id,
  part,
  layoutMode,
  active,
  companionShown,
  deckEnabled,
}: UseDeckPlankOptions): DeckPlank => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const { state, deck } = useDeckState();
  const runAction = useActionRunner();
  const breakpoint = useBreakpoints();
  const node = useNode(graph, id);
  const breadcrumbs = useBreadcrumbs(graph, id);
  // Subscribe reactively to the node's actions: they are loaded asynchronously by `Graph.expand`
  // below, and the node atom does not re-emit when action edges arrive, so a one-shot read would
  // leave a freshly-created plank's sigil menu empty until an unrelated re-render.
  const actions = useActions(graph, node?.id);
  const companions = useCompanions(id);
  const { hasAttention } = useAttention(id);
  const selectedVariant = useSelectedCompanionVariant();

  // The companion is shown when open; in multi mode it attaches only to the attended plank (hidden until
  // a plank gains attention). Which companion shows follows the globally-selected variant (view state),
  // falling back to the first when none is stored.
  const showCompanion = !!companionShown && (layoutMode !== 'multi' || hasAttention);
  const { companionId } = useSelectedCompanion(companions, showCompanion ? selectedVariant : undefined);
  const resolvedCompanionId = showCompanion ? companionId : undefined;
  const currentCompanion = companions.find((companion) => companion.id === resolvedCompanionId);
  const hasCompanion = !!(resolvedCompanionId && currentCompanion);
  const companionOrientation = deck.companionOrientation ?? 'horizontal';

  // Ordering within the active stack drives the increment-start/end affordances.
  const index = active ? active.findIndex((entryId) => entryId === id) : -1;
  const isOrdered = !!active && index >= 0;
  const canIncrementStart = isOrdered && index > 0;
  const canIncrementEnd = isOrdered && index < (active?.length ?? 1) - 1;

  const isCompanionNode = node?.type === PLANK_COMPANION_TYPE;
  const capabilities = useMemo<PlankCapabilities>(
    () => ({
      deck: deckEnabled ?? true,
      solo: breakpoint !== 'mobile' && (part === 'solo' || part === 'multi'),
      incrementStart: canIncrementStart,
      incrementEnd: canIncrementEnd,
      fullscreen: !isCompanionNode,
      // Offer to open the companion (solo, or the attended plank in multi) when one exists and isn't shown.
      companion: !isCompanionNode && companions.length > 0 && !hasCompanion && (layoutMode !== 'multi' || hasAttention),
    }),
    [
      deckEnabled,
      breakpoint,
      part,
      canIncrementStart,
      canIncrementEnd,
      isCompanionNode,
      layoutMode,
      companions.length,
      hasCompanion,
      hasAttention,
    ],
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

  const variant = isCompanionNode ? Attention.getLinkedVariant(id) : undefined;
  const sigilActions = useMemo<AttentionSigilAction[][] | undefined>(() => {
    if (!node) {
      return undefined;
    }
    if (variant) {
      return [];
    }

    return [actions.filter((action) => Node.hasDisposition(action, PLANK_ACTION_DISPOSITIONS))].filter(
      (group) => group.length > 0,
    );
  }, [actions, node, variant]);

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

  const onNavigate = useCallback(
    (navId: string) => invokePromise(LayoutOperation.Open, { subject: [navId] }),
    [invokePromise],
  );

  const onAdjust = useCallback(
    (type: DeckOperation.PartAdjustment) => {
      if (type === 'close') {
        if (part === 'complementary') {
          return invokePromise(LayoutOperation.UpdateComplementary, { state: 'collapsed' });
        }
        if (active) {
          // Close the plank and everything to its right (stack pop).
          const closeIndex = active.indexOf(id);
          const toClose = closeIndex !== -1 ? active.slice(closeIndex) : [id];
          return invokePromise(LayoutOperation.Close, { subject: toClose });
        }
        return invokePromise(LayoutOperation.Close, { subject: [id] });
      }

      return invokePromise(DeckOperation.Adjust, { type, id });
    },
    [invokePromise, part, active, id],
  );

  const onResize = useCallback(
    (size: number) => invokePromise(DeckOperation.UpdatePlankSize, { id, size }),
    [invokePromise, id],
  );

  const onScrollIntoView = useCallback(
    (subject?: string) => invokePromise(LayoutOperation.ScrollIntoView, { subject }),
    [invokePromise],
  );

  const onUpdateCompanion = useCallback(
    (companion: string | null) => invokePromise(LayoutOperation.UpdateCompanion, { subject: companion }),
    [invokePromise],
  );

  return {
    node,
    breadcrumbs,
    companions,
    resolvedCompanionId,
    currentCompanion,
    hasCompanion,
    companionOrientation,
    capabilities,
    sigilActions,
    popoverAnchorId: state.popoverAnchorId,
    scrollIntoView: state.scrollIntoView,
    onAction,
    onNavigate,
    onAdjust,
    onResize,
    onScrollIntoView,
    onUpdateCompanion,
  };
};
