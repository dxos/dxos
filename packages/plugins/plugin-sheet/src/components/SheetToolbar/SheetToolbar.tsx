//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { useContext, useMemo } from 'react';

import { useAppGraph } from '@dxos/app-toolkit/ui';
import { type CompleteCellRange } from '@dxos/compute-hyperformula';
import { composable, composableProps } from '@dxos/react-ui';
import {
  type ActionGraphProps,
  Menu,
  createGapSeparator,
  graphActions,
  isToolbarAction,
  useMenuActions,
} from '@dxos/react-ui-menu';

import { type SheetModel } from '../../model/index.ts';
import { useSheetContext } from '../SheetRoot/index.ts';
import { createAlign, useAlignState } from './align.ts';
import { createStyle, useStyleState } from './style.ts';
import { type ToolbarStateAtom, useToolbarState } from './useToolbarState.ts';

type ToolbarActionsContext = {
  model: SheetModel;
  stateAtom: ToolbarStateAtom;
  registry: Registry.AtomRegistry;
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
    return Atom.make((get) => graphActions(graph, get, attendableId, { filter: isToolbarAction }));
  }, [graph, attendableId]);

  const actionsCreator = useMemo(
    () => createToolbarActions({ model, stateAtom, registry, cursorFallbackRange, customActions }),
    [model, stateAtom, registry, cursorFallbackRange, customActions],
  );
  const menuActions = useMenuActions(actionsCreator);

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Menu.Toolbar {...composableProps(props)} ref={forwardedRef}>
        <Menu.Items />
      </Menu.Toolbar>
    </Menu.Root>
  );
});

SheetToolbar.displayName = 'SheetToolbar';
