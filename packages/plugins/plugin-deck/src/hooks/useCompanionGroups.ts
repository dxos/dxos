//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type AppNode } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { type Node } from '@dxos/plugin-graph';
import { useNode } from '@dxos/plugin-graph/hooks';
import { Attention, useAttended } from '@dxos/react-ui-attention';

import { resolveCompanionAnchor } from '../util';
import { useCompanions } from './useCompanions';
import { useDeckCompanions } from './useDeckCompanions';
import { useDeckState } from './useDeckState';

/** Rail ordering: the companion for what you are working in sits above ones that always apply. */
const SCOPE_ORDER = ['node', 'workspace', 'global'] as const satisfies readonly AppNode.CompanionScope[];

/** Distinguishes a node companion's tab value from a root one, whose bare variant is already persisted. */
const NODE_VALUE_PREFIX = 'node/';

export type CompanionEntry = {
  /** Tab value; unique across groups and stable enough to persist as the selected panel. */
  value: string;
  variant: string;
  scope: AppNode.CompanionScope;
  node: Node.Node;
};

export type CompanionGroup = {
  scope: AppNode.CompanionScope;
  companions: CompanionEntry[];
};

export type CompanionGroups = {
  groups: CompanionGroup[];
  /** The plank whose companions populate the `node` group, and the object they accompany. */
  anchorId: string | undefined;
  anchorSubject: unknown;
};

export const isNodeCompanionValue = (value: string | undefined): boolean =>
  value?.startsWith(NODE_VALUE_PREFIX) ?? false;

/** The companion variant a selected node companion names, or undefined for a root-level one. */
export const getNodeCompanionVariant = (value: string | undefined): string | undefined =>
  isNodeCompanionValue(value) ? value!.slice(NODE_VALUE_PREFIX.length) : undefined;

/** The value that selects `variant` on whichever node currently holds attention. */
export const makeNodeCompanionValue = (variant: string): string => `${NODE_VALUE_PREFIX}${variant}`;

/**
 * Which companion to actually show, given the user's stored preference. A preference the current node
 * does not offer falls back to that node's first companion, then to the first of any group — the stored
 * preference itself is left alone by the caller, so returning to a node that does offer it shows it
 * again. Undefined only when there is nothing to show at all, which is the one case worth collapsing on.
 */
export const resolveActiveCompanion = (
  preferred: string | undefined,
  groups: readonly CompanionGroup[],
): string | undefined => {
  if (preferred && groups.some((group) => group.companions.some((entry) => entry.value === preferred))) {
    return preferred;
  }
  const nodeGroup = groups.find((group) => group.scope === 'node');
  return nodeGroup?.companions[0]?.value ?? groups[0]?.companions[0]?.value;
};

/**
 * Every companion applicable right now, grouped most-specific-first. Node companions come from the
 * attended plank, so the first group re-resolves as attention moves; workspace and global companions
 * hang off the graph root and are split by their declared scope.
 */
export const useCompanionGroups = (): CompanionGroups => {
  const { graph } = useAppGraph();
  const { deck } = useDeckState();
  const attended = useAttended();

  const anchorId = useMemo(() => resolveCompanionAnchor(deck.active, attended), [deck.active, attended]);
  const anchorNode = useNode(graph, anchorId);
  const nodeCompanions = useCompanions(anchorId);
  const rootCompanions = useDeckCompanions();

  const groups = useMemo(() => {
    const entries: CompanionEntry[] = [
      ...nodeCompanions.map((node) => {
        const variant = Attention.getLinkedVariant(node.id);
        return { value: `${NODE_VALUE_PREFIX}${variant}`, variant, scope: 'node' as const, node };
      }),
      ...rootCompanions.map((node) => {
        const variant = Attention.getLinkedVariant(node.id);
        // Companions contributed before `scope` existed read as global, which is what they were.
        const scope = (node.properties.scope ?? 'global') as AppNode.CompanionScope;
        return { value: variant, variant, scope, node };
      }),
    ];

    return SCOPE_ORDER.map((scope) => ({
      scope,
      companions: entries.filter((entry) => entry.scope === scope),
    })).filter((group) => group.companions.length > 0);
  }, [nodeCompanions, rootCompanions]);

  return { groups, anchorId, anchorSubject: anchorNode?.data };
};
