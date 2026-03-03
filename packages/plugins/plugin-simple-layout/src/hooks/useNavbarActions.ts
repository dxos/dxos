//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Node, useActionRunner } from '@dxos/plugin-graph';
import { useTranslation } from '@dxos/react-ui';
import {
  type ActionExecutor,
  type ActionGraphProps,
  createGapSeparator,
  createMenuItemGroup,
} from '@dxos/react-ui-menu';

import { meta } from '../meta';
import { SimpleLayoutState } from '../types';

import { createCompanionActions } from './actions';

const MAIN_MENU_GROUP_ID = 'navbar-main-menu';

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
  const stateAtom = useCapability(SimpleLayoutState);

  // Create a computed atom that derives everything from graph connections and state.
  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        // Add companion actions.
        const { nodes, edges } = createCompanionActions(graph, stateAtom, get, {
          idPrefix: 'navbar',
          invokeSync,
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

        // Get menu actions from root connections.
        const rootConnections = get(graph.connections(Node.RootId));
        const menuActions = rootConnections.filter((node) => node.properties.disposition === 'menu');

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
