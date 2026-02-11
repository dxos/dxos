//
// Copyright 2025 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import { useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useCapability, useOperationInvoker } from '@dxos/app-framework/react';
import { Graph, Node, useActionRunner, useNode } from '@dxos/plugin-graph';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type ActionGraphProps } from '@dxos/react-ui-menu';

import { type AppBarProps } from '../components';
import { meta } from '../meta';
import { SimpleLayoutState as SimpleLayoutStateCapability } from '../types';

/**
 * Hook that computes all AppBar props from the app graph.
 * Derives activeId from state atom. Returns props ready to spread into the AppBar component.
 */
export const useAppBarProps = (): Omit<AppBarProps, 'classNames'> => {
  const { t } = useTranslation(meta.id);
  const stateAtom = useCapability(SimpleLayoutStateCapability);
  const state = useAtomValue(stateAtom);
  const { graph } = useAppGraph();
  const { invokeSync } = useOperationInvoker();
  const runAction = useActionRunner();

  // Derive activeId from state.
  const activeId = state.active ?? state.workspace;
  const node = useNode(graph, activeId);

  // Compute title from node label.
  const title = node ? toLocalizedString(node.properties.label, t) : undefined;

  // Build actions atom filtering by disposition.
  // Derive activeId from state atom so we don't need to recreate this atom when it changes.
  const actionsAtom = useMemo(
    () =>
      Atom.make((get): ActionGraphProps => {
        const state = get(stateAtom);
        const activeId = state.active ?? state.workspace;
        const allActions = activeId ? get(graph.actions(activeId)) : [];
        const filtered = allActions.filter((action) =>
          ['list-item', 'list-item-primary', 'heading-list-item'].includes(action.properties.disposition),
        );
        return {
          nodes: filtered as ActionGraphProps['nodes'],
          edges: filtered.map((action) => ({ source: 'root', target: action.id })),
        };
      }),
    [graph, stateAtom],
  );

  // Back button logic.
  const showBackButton = activeId !== undefined && activeId !== Node.RootId;

  const onBack = useCallback(() => {
    if (state.active) {
      const isWorkspace = Graph.getNode(graph, state.active).pipe(
        Option.map((node) => node.properties.disposition === 'workspace'),
        Option.getOrElse(() => false),
      );

      // If history is empty and this is a workspace, go to home.
      if (state.history.length === 0 && isWorkspace) {
        invokeSync(Common.LayoutOperation.SwitchWorkspace, { subject: Node.RootId });
      } else {
        // Otherwise, close (which will pop from history or clear active).
        invokeSync(Common.LayoutOperation.Close, { subject: [state.active] });
      }
    } else {
      invokeSync(Common.LayoutOperation.SwitchWorkspace, { subject: Node.RootId });
    }
  }, [graph, invokeSync, state.active, state.history.length]);

  // Compute popover anchor ID.
  const popoverAnchorId =
    node && state.popoverAnchorId === `dxos.org/ui/${meta.id}/${node.id}` ? state.popoverAnchorId : undefined;

  return {
    title,
    actions: actionsAtom,
    showBackButton,
    popoverAnchorId,
    onBack: onBack,
    onAction: runAction,
  };
};
