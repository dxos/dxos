//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useCapability, useOperationInvoker } from '@dxos/app-framework/react';
import { Node, useActionRunner } from '@dxos/plugin-graph';
import { useTranslation } from '@dxos/react-ui';
import {
  type ActionExecutor,
  type ActionGraphProps,
  createGapSeparator,
  createMenuItemGroup,
} from '@dxos/react-ui-menu';
import { byPosition } from '@dxos/util';

import { meta } from '../meta';
import { SimpleLayoutState as SimpleLayoutStateCapability } from '../types';

const MAIN_MENU_GROUP_ID = 'navbar-main-menu';

// TODO(wittjosiah): Factor out to shared location with plugin-deck.
const PLANK_COMPANION_TYPE = 'dxos.org/plugin/deck/plank-companion';

export type NavbarActions = {
  /** Action graph atom for the navbar. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Action executor callback. */
  onAction: ActionExecutor;
};

/**
 * Builds the navbar actions including companion icons, separator, and main menu dropdown.
 * Derives everything from graph connection atoms for proper reactivity.
 */
export const useNavbarActions = (): NavbarActions => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const { invokeSync } = useOperationInvoker();
  const stateAtom = useCapability(SimpleLayoutStateCapability);

  // Create a computed atom that derives everything from graph connections and state.
  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        // Derive activeId from state atom so we don't need to recreate this atom when it changes.
        const state = get(stateAtom);
        const activeId = state.active ?? state.workspace;

        // Get companions from graph connections for activeId.
        const activeConnections = activeId ? get(graph.connections(activeId)) : [];
        const companions = activeConnections
          .filter((node) => node.type === PLANK_COMPANION_TYPE)
          .toSorted((a, b) => byPosition(a.properties, b.properties));

        // Get menu actions from root connections.
        const rootConnections = get(graph.connections(Node.RootId));
        const menuActions = rootConnections.filter((node) => node.properties.disposition === 'menu');

        const nodes: ActionGraphProps['nodes'] = [];
        const edges: ActionGraphProps['edges'] = [];

        // Add companion actions.
        companions.forEach((companion) => {
          const companionAction = {
            id: `navbar-companion-${companion.id}`,
            type: Node.ActionType,
            properties: {
              icon: companion.properties.icon ?? 'ph--placeholder--regular',
              label: companion.properties.label,
              iconOnly: true,
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

        // Add gap separator.
        const gapSeparator = createGapSeparator('navbar-gap');
        nodes.push(...gapSeparator.nodes);
        edges.push(...gapSeparator.edges);

        // Add main menu dropdown group.
        const mainMenuGroup = createMenuItemGroup(MAIN_MENU_GROUP_ID, {
          variant: 'dropdownMenu',
          icon: 'ph--list--regular',
          iconOnly: true,
          label: t('main menu label'),
          testId: 'simpleLayoutPlugin.addSpace',
        });
        nodes.push(mainMenuGroup);
        edges.push({ source: 'root', target: mainMenuGroup.id });

        // Add menu actions as children of the dropdown group.
        menuActions.forEach((menuAction) => {
          nodes.push(menuAction as ActionGraphProps['nodes'][number]);
          edges.push({ source: MAIN_MENU_GROUP_ID, target: menuAction.id });
        });

        return { nodes, edges };
      }),
    [graph, stateAtom, invokeSync, t],
  );

  return { actions: actionsAtom, onAction: runAction };
};
