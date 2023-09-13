//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { DndPluginContext, DndPluginStoreValue } from '@braneframe/plugin-dnd';
import { GraphContext, GraphStore } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { SplitViewContext, SplitViewState } from '@braneframe/plugin-splitview';
import { Tooltip, Tree } from '@dxos/aurora';

import { TreeViewSortableImpl } from './NavTree';
import { TreeViewContext } from '../../TreeViewContext';
import { TreeViewContextValue } from '../../types';

export default {
  component: TreeViewSortableImpl,
};

const graph = new GraphStore();
buildGraph(graph, [
  {
    id: 'test1',
    label: 'test1',
    children: [
      {
        id: 'test1.1',
        label: 'test1.1',
      },
      {
        id: 'test1.2',
        label: 'test1.2',
      },
    ],
  },
  {
    id: 'test2',
    label: 'test2',
  },
]);

const dndState = deepSignal<DndPluginStoreValue>({
  overlayDropAnimation: 'away',
});

const splitViewState = deepSignal<SplitViewState>({
  sidebarOpen: true,
  complementarySidebarOpen: true,
  dialogContent: 'never',
  dialogOpen: false,
});

const treeViewState = deepSignal<TreeViewContextValue>({
  active: undefined,
  previous: undefined,
  get activeNode() {
    return this.active && graph.find(this.active);
  },
  get previousNode() {
    return this.previous && graph.find(this.previous);
  },
  appState: undefined,
}) as RevertDeepSignal<TreeViewContextValue>;

export const Default = {
  render: () => (
    <Tree.Root>
      <TreeViewSortableImpl {...{ node: graph.root, items: graph.root.children, level: 0 }} />
    </Tree.Root>
  ),
  decorators: [
    (Story: any) => (
      <Tooltip.Provider>
        <DndPluginContext.Provider value={dndState}>
          <GraphContext.Provider value={{ graph }}>
            <SplitViewContext.Provider value={splitViewState}>
              <TreeViewContext.Provider value={treeViewState}>
                <Story />
              </TreeViewContext.Provider>
            </SplitViewContext.Provider>
          </GraphContext.Provider>
        </DndPluginContext.Provider>
      </Tooltip.Provider>
    ),
  ],
};
