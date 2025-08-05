//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { type PropsWithChildren, useMemo } from 'react';

import { useAppGraph } from '@dxos/app-framework';
import { type CompleteCellRange } from '@dxos/compute';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  type ActionGraphEdges,
  type ActionGraphNodes,
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

//
// Root
//

export type SheetToolbarProps = ThemedClassName<PropsWithChildren<{ id: string }>>;

const createToolbarActions = (
  model: SheetModel,
  state: ToolbarState,
  cursorFallbackRange?: CompleteCellRange,
  customActions?: Rx.Rx<ActionGraphProps>,
) => {
  return Rx.make((get) => {
    const align = get(rxFromSignal(() => createAlign(model, state, cursorFallbackRange)));
    const style = get(rxFromSignal(() => createStyle(model, state, cursorFallbackRange)));
    const gap = createGapSeparator();
    const nodes: ActionGraphNodes = [...align.nodes, ...style.nodes, ...gap.nodes];
    const edges: ActionGraphEdges = [...align.edges, ...style.edges, ...gap.edges];
    if (customActions) {
      const custom = get(customActions);
      nodes.push(...custom.nodes);
      edges.push(...custom.edges);
    }
    return {
      nodes,
      edges,
    };
  });
};

export const SheetToolbar = ({ id, classNames }: SheetToolbarProps) => {
  const { model, cursorFallbackRange } = useSheetContext();
  const state = useToolbarState({});
  useAlignState(state);
  useStyleState(state);

  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Rx.make((get) => {
      const actions = get(graph.actions(id));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      return { nodes, edges: nodes.map((node) => ({ source: 'root', target: node.id })) };
    });
  }, [graph]);

  const actionsCreator = useMemo(
    () => createToolbarActions(model, state, cursorFallbackRange, customActions),
    [model, state, cursorFallbackRange, customActions],
  );
  const menu = useMenuActions(actionsCreator);

  return (
    <MenuProvider {...menu} attendableId={id}>
      <ToolbarMenu classNames={classNames} />
    </MenuProvider>
  );
};
