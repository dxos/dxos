//
// Copyright 2024 DXOS.org
//

import { Atom, type Registry, RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { type CompleteCellRange } from '@dxos/compute';
import { type ActionGraphProps, Menu, createGapSeparator, useMenuActions } from '@dxos/react-ui-menu';
import { composable, composableProps } from '@dxos/ui-theme';

import { type SheetModel } from '../../model';
import { useSheetContext } from '../SheetRoot';

import { createAlign, useAlignState } from './align';
import { createStyle, useStyleState } from './style';
import { type ToolbarStateAtom, useToolbarState } from './useToolbarState';

type ToolbarActionsContext = {
  model: SheetModel;
  stateAtom: ToolbarStateAtom;
  registry: Registry.Registry;
  cursorFallbackRange?: CompleteCellRange;
  customActions?: Atom.Atom<ActionGraphProps>;
};

const createToolbarActions = ({
  model,
  stateAtom,
  registry,
  cursorFallbackRange,
  customActions,
}: ToolbarActionsContext): Atom.Atom<ActionGraphProps> => {
  return Atom.make((get) => {
    const state = get(stateAtom);
    const context = { model, state, stateAtom, registry, cursorFallbackRange };
    const align = createAlign(context);
    const style = createStyle(context);
    const gap = createGapSeparator();

    const graph: ActionGraphProps = {
      nodes: [...align.nodes, ...style.nodes, ...gap.nodes],
      edges: [...align.edges, ...style.edges, ...gap.edges],
    };

    if (customActions) {
      const custom = get(customActions);
      graph.nodes.push(...custom.nodes);
      graph.edges.push(...custom.edges);
    }

    return graph;
  });
};

export type SheetToolbarProps = {};

export const SheetToolbar = composable<HTMLDivElement, SheetToolbarProps>((props, forwardedRef) => {
  const { attendableId, model, cursorFallbackRange } = useSheetContext();
  const stateAtom = useToolbarState({});
  const registry = useContext(RegistryContext);
  useAlignState(stateAtom);
  useStyleState(stateAtom);

  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Atom.make((get) => {
      const actions = get(graph.actions(attendableId));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      return {
        nodes,
        edges: nodes.map((node) => ({ source: 'root', target: node.id, relation: 'child' })),
      };
    });
  }, [graph, attendableId]);

  const actionsCreator = useMemo(
    () => createToolbarActions({ model, stateAtom, registry, cursorFallbackRange, customActions }),
    [model, stateAtom, registry, cursorFallbackRange, customActions],
  );
  const menuActions = useMenuActions(actionsCreator);

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Menu.Toolbar {...composableProps(props)} ref={forwardedRef} />
    </Menu.Root>
  );
});

SheetToolbar.displayName = 'SheetToolbar';
