//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Node } from '@dxos/plugin-graph';
import { getLinkedVariant } from '@dxos/react-ui-attention';
import { type ActionGraphProps } from '@dxos/react-ui-menu';
import { byPosition } from '@dxos/util';

import { type SimpleLayoutState } from '#types';

// TODO(wittjosiah): Factor out to shared location with plugin-deck.
export const PLANK_COMPANION_TYPE = 'org.dxos.plugin.deck.plank-companion';

export type CompanionActionsConfig = {
  /** Prefix for companion action IDs (e.g. 'navbar' or 'drawer') */
  idPrefix: string;
  /** Optional: highlight companion with this variant */
  selectedVariant?: string;
  /** State updater for toggling the drawer. */
  updateState: (fn: (state: SimpleLayoutState) => SimpleLayoutState) => void;
};

/**
 * Creates action graph nodes and edges for companion actions.
 * Shared logic between useNavbarActions and useDrawerActions.
 */
// TODO(burdon): Use builder pattern.
export const createCompanionActions = (
  graph: AppCapabilities.AppGraph['graph'],
  stateAtom: Atom.Atom<SimpleLayoutState>,
  get: (atom: Atom.Atom<any>) => any,
  config: CompanionActionsConfig,
): Pick<ActionGraphProps, 'nodes' | 'edges'> => {
  const { idPrefix, selectedVariant, updateState } = config;

  // Derive activeId from state atom.
  const state = get(stateAtom);
  const activeId = state.active ?? state.workspace;

  // Get companions from graph connections for activeId.
  const activeConnections = activeId ? get(graph.connections(activeId, 'child')) : [];
  const companions = activeConnections
    .filter((node: Node.Node) => node.type === PLANK_COMPANION_TYPE)
    .toSorted((a: Node.Node, b: Node.Node) => byPosition(a.properties, b.properties));

  const nodes: ActionGraphProps['nodes'] = [];
  const edges: ActionGraphProps['edges'] = [];

  companions.forEach((companion: Node.Node) => {
    const companionVariant = getLinkedVariant(companion.id);
    const companionAction = {
      id: `${idPrefix}-companion-${companion.id}`,
      type: Node.ActionType,
      properties: {
        icon: companion.properties.icon ?? 'ph--placeholder--regular',
        label: companion.properties.label,
        iconOnly: true,
        ...(selectedVariant !== undefined && {
          variant: selectedVariant === companionVariant ? 'primary' : 'ghost',
        }),
      },
      data: () =>
        Effect.sync(() =>
          updateState((current) => {
            const closing = current.companionVariant === companionVariant && current.drawerState !== 'closed';
            return {
              ...current,
              companionVariant: closing ? undefined : companionVariant,
              drawerState: closing ? 'closed' : 'open',
            };
          }),
        ),
    };
    nodes.push(companionAction);
    edges.push({ source: 'root', target: companionAction.id, relation: 'child' });
  });

  return { nodes, edges };
};
