//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import React, { type PropsWithChildren, useMemo } from 'react';

import { useAppGraph } from '@dxos/app-framework/react';
import { type CompleteCellRange } from '@dxos/compute';
import {
  type ActionGraphProps,
  MenuProvider,
  ToolbarMenu,
  createGapSeparator,
  rxFromSignal,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { type SheetModel } from '../../model';
import { useSheetContext } from '../SheetContext';

import { createAlign, useAlignState } from './align';
import { createStyle, useStyleState } from './style';
import { type ToolbarState, useToolbarState } from './useToolbarState';

const createToolbarActions = (
  model: SheetModel,
  state: ToolbarState,
  cursorFallbackRange?: CompleteCellRange,
  customActions?: Atom.Atom<ActionGraphProps>,
): Atom.Atom<ActionGraphProps> => {
  return Atom.make((get) => {
    const align = get(rxFromSignal(() => createAlign(model, state, cursorFallbackRange)));
    const style = get(rxFromSignal(() => createStyle(model, state, cursorFallbackRange)));
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

export type SheetToolbarProps = PropsWithChildren<{ id: string }>;

export const SheetToolbar = ({ id }: SheetToolbarProps) => {
  const { model, cursorFallbackRange } = useSheetContext();
  const state = useToolbarState({});
  useAlignState(state);
  useStyleState(state);

  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Atom.make((get) => {
      const actions = get(graph.actions(id));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      return {
        nodes,
        edges: nodes.map((node) => ({ source: 'root', target: node.id })),
      };
    });
  }, [graph]);

  const actionsCreator = useMemo(
    () => createToolbarActions(model, state, cursorFallbackRange, customActions),
    [model, state, cursorFallbackRange, customActions],
  );
  const menu = useMenuActions(actionsCreator);

  return (
    <MenuProvider {...menu} attendableId={id}>
      <ToolbarMenu />
    </MenuProvider>
  );
};
