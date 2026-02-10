//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Common } from '@dxos/app-framework';
import { Node } from '@dxos/plugin-graph';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { type ActionGraphProps } from '@dxos/react-ui-menu';
import { byPosition } from '@dxos/util';

// TODO(wittjosiah): Factor out to shared location with plugin-deck.
const PLANK_COMPANION_TYPE = 'dxos.org/plugin/deck/plank-companion';

export type CompanionActionsConfig = {
  /** Prefix for companion action IDs (e.g. 'navbar' or 'drawer') */
  idPrefix: string;
  /** Optional: highlight companion with this variant */
  selectedVariant?: string;
  /** invokeSync function for dispatching operations */
  invokeSync: (operation: any, args: any) => void;
};

/**
 * Creates action graph nodes and edges for companion actions.
 * Shared logic between useNavbarActions and useDrawerActions.
 */
export const createCompanionActions = (
  graph: any, // AppGraph from useAppGraph
  stateAtom: Atom.Atom<any>,
  get: (atom: Atom.Atom<any>) => any,
  config: CompanionActionsConfig,
): Pick<ActionGraphProps, 'nodes' | 'edges'> => {
  const { idPrefix, selectedVariant, invokeSync } = config;

  // Derive activeId from state atom.
  const state = get(stateAtom);
  const activeId = state.active ?? state.workspace;

  // Get companions from graph connections for activeId.
  const activeConnections = activeId ? get(graph.connections(activeId)) : [];
  const companions = activeConnections
    .filter((node: Node.Node) => node.type === PLANK_COMPANION_TYPE)
    .toSorted((a: Node.Node, b: Node.Node) => byPosition(a.properties, b.properties));

  const nodes: ActionGraphProps['nodes'] = [];
  const edges: ActionGraphProps['edges'] = [];

  // Add companion actions.
  companions.forEach((companion: Node.Node) => {
    // Extract variant for highlighting if needed.
    const [, companionVariant] = companion.id.split(ATTENDABLE_PATH_SEPARATOR);

    const companionAction = {
      id: `${idPrefix}-companion-${companion.id}`,
      type: Node.ActionType,
      properties: {
        icon: companion.properties.icon ?? 'ph--placeholder--regular',
        label: companion.properties.label,
        iconOnly: true,
        // Conditionally add variant highlighting.
        ...(selectedVariant !== undefined && {
          variant: selectedVariant === companionVariant ? 'primary' : 'ghost',
        }),
      },
      data: () =>
        Effect.sync(() =>
          invokeSync(Common.LayoutOperation.Open, {
            subject: [companion.id],
          }),
        ),
    };
    nodes.push(companionAction);
    edges.push({ source: 'root', target: companionAction.id });
  });

  return { nodes, edges };
};
