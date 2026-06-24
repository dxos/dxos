//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AttentionSigilAction } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, type Node, useActionRunner, useNode } from '@dxos/plugin-graph';
import { getLinkedVariant } from '@dxos/react-ui-attention';

import { useBreakpoints, useCompanions, useDeckState, useSelectedCompanion } from '#hooks';
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
  /** Preferred companion variant to surface. */
  companionVariant?: string;
  deckEnabled?: boolean;
};

export type DeckPlank = {
  node: Node.Node | undefined;
  companions: Node.Node[];
  resolvedCompanionId: string | undefined;
  currentCompanion: Node.Node | undefined;
  hasCompanion: boolean;
  capabilities: PlankCapabilities;
  /** Grouped sigil-menu actions, or `undefined` when the node is unresolved. */
  sigilActions: AttentionSigilAction[][] | undefined;
  popoverAnchorId?: string;
  scrollIntoView?: string;
  onAction: (action: AttentionSigilAction) => void;
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
  companionVariant,
  deckEnabled,
}: UseDeckPlankOptions): DeckPlank => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const { state } = useDeckState();
  const runAction = useActionRunner();
  const breakpoint = useBreakpoints();
  const node = useNode(graph, id);
  const companions = useCompanions(id);

  // In multi mode only the last plank hosts a companion; in solo/complementary the companion follows the
  // preferred variant.
  const isLastPlankInMulti =
    layoutMode === 'multi' && !!active && active.length > 0 && active[active.length - 1] === id;
  const variantForThisPlank =
    layoutMode === 'multi' ? (isLastPlankInMulti ? companionVariant : undefined) : companionVariant;
  const { companionId } = useSelectedCompanion(companions, variantForThisPlank);
  const resolvedCompanionId =
    layoutMode === 'multi' && isLastPlankInMulti && companions.length > 0
      ? companionId
      : variantForThisPlank
        ? companionId
        : undefined;
  const currentCompanion = companions.find((companion) => companion.id === resolvedCompanionId);
  const hasCompanion = !!(resolvedCompanionId && currentCompanion);

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
      companion: layoutMode !== 'multi' && !isCompanionNode && companions.length > 0,
    }),
    [deckEnabled, breakpoint, part, canIncrementStart, canIncrementEnd, isCompanionNode, layoutMode, companions.length],
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

  const variant = isCompanionNode ? getLinkedVariant(id) : undefined;
  const sigilActions = useMemo<AttentionSigilAction[][] | undefined>(() => {
    if (!node) {
      return undefined;
    }
    if (variant) {
      return [];
    }

    return [
      Graph.getActions(graph, node.id).filter((action) =>
        PLANK_ACTION_DISPOSITIONS.includes(action.properties.disposition),
      ),
    ].filter((group) => group.length > 0);
  }, [graph, node, variant]);

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
    companions,
    resolvedCompanionId,
    currentCompanion,
    hasCompanion,
    capabilities,
    sigilActions,
    popoverAnchorId: state.popoverAnchorId,
    scrollIntoView: state.scrollIntoView,
    onAction,
    onAdjust,
    onResize,
    onScrollIntoView,
    onUpdateCompanion,
  };
};
