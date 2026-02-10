//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { useMemo } from 'react';

import { useAppGraph, useCapability, useOperationInvoker } from '@dxos/app-framework/react';
import { Node, useActionRunner } from '@dxos/plugin-graph';
import { useTranslation } from '@dxos/react-ui';
import { type ActionExecutor, type ActionGraphProps, createGapSeparator } from '@dxos/react-ui-menu';

import { useMobileLayout } from '../components';
import { meta } from '../meta';
import { SimpleLayoutState as SimpleLayoutStateCapability } from '../types';

import { createCompanionActions } from './actions';
import { useSimpleLayoutState } from './useSimpleLayoutState';

export type DrawerActions = {
  /** Action graph atom for the drawer. */
  actions: Atom.Atom<ActionGraphProps>;
  /** Action executor callback. */
  onAction: ActionExecutor;
};

/**
 * Builds the drawer actions including companion tabs and toolbar buttons.
 */
export const useDrawerActions = (consumerName: string): DrawerActions => {
  const { t } = useTranslation(meta.id);
  const stateAtom = useCapability(SimpleLayoutStateCapability);
  const { graph } = useAppGraph();
  const runAction = useActionRunner();
  const { invokeSync } = useOperationInvoker();
  const { updateState } = useSimpleLayoutState();
  const { keyboardOpen } = useMobileLayout(consumerName);

  // Create a computed atom that derives everything from graph connections and state.
  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        // Derive drawer state from state atom.
        const state = get(stateAtom);

        // Add companion tab actions.
        const { nodes, edges } = createCompanionActions(graph, stateAtom, get, {
          idPrefix: 'drawer',
          selectedVariant: state.companionVariant,
          invokeSync,
        });

        // Add gap separator before toolbar buttons.
        const gapSeparator = createGapSeparator('drawer-gap');
        nodes.push(...gapSeparator.nodes);
        edges.push(...gapSeparator.edges);

        // Add expand/collapse toggle button (hidden when keyboard is open).
        if (!keyboardOpen) {
          const isExpanded = state.drawerState === 'expanded';
          const toggleExpandAction = {
            id: 'drawer-toggle-expand',
            type: Node.ActionType,
            properties: {
              icon: isExpanded ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular',
              label: isExpanded ? t('collapse drawer label') : t('expand drawer label'),
              iconOnly: true,
            },
            data: () =>
              Effect.sync(() => updateState((state) => ({ ...state, drawerState: isExpanded ? 'open' : 'expanded' }))),
          };
          nodes.push(toggleExpandAction);
          edges.push({ source: 'root', target: toggleExpandAction.id });
        }

        // Add close button.
        const closeAction = {
          id: 'drawer-close',
          type: Node.ActionType,
          properties: {
            icon: 'ph--x--regular',
            label: t('close drawer label'),
            iconOnly: true,
          },
          data: () => Effect.sync(() => updateState((state) => ({ ...state, drawerState: 'closed' }))),
        };
        nodes.push(closeAction);
        edges.push({ source: 'root', target: closeAction.id });

        return { nodes, edges };
      }),
    [graph, stateAtom, invokeSync, updateState, keyboardOpen, t],
  );

  return { actions: actionsAtom, onAction: runAction };
};
