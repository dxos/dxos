//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { getIndices } from '@tldraw/indices';
import { RevertDeepSignal, deepSignal } from 'deepsignal/react';
import React from 'react';

import { GraphStore, GraphContext, Graph } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { SplitViewContext, SplitViewState } from '@braneframe/plugin-splitview';
import { DensityProvider, Tooltip } from '@dxos/aurora';
import { Mosaic, MosaicRootProps, MosaicState } from '@dxos/aurora-grid';

import { NavTreeRoot } from './NavTree';
import { NavTreeItemDelegator } from './NavTreeItem';
import { TreeViewContext } from '../../TreeViewContext';
import { TreeViewContextValue } from '../../types';

faker.seed(1234);
const fake = faker.helpers.fake;

export default {
  component: NavTreeRoot,
  argTypes: { onMosaicChange: { action: 'mosaic changed' } },
};

const content = [...Array(4)].map(() => ({
  id: faker.string.uuid(),
  label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
  description: fake('{{commerce.productDescription}}'),
  children: [...Array(4)].map(() => ({
    id: faker.string.uuid(),
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
    children: [...Array(4)].map(() => ({
      id: faker.string.uuid(),
      label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
      description: fake('{{commerce.productDescription}}'),
    })),
  })),
}));

const graph = new GraphStore();
buildGraph(graph, content);

const defaultIndices = getIndices(99);
let defaultIndicesCursor = 0;

const mosaicAcc: MosaicState = {
  tiles: {},
  relations: {},
};

const mosaicData: Record<string, any> = {};

const getLevel = (node: Graph.Node, level = 0): number => {
  if (!node.parent) {
    return level;
  } else {
    return getLevel(node.parent, level + 1);
  }
};

graph.traverse({
  onVisitNode: (node) => {
    const level = getLevel(node, -1);
    mosaicAcc.tiles[node.id] = {
      id: node.id,
      index: defaultIndices[defaultIndicesCursor],
      variant: 'treeitem',
      sortable: true,
      expanded: false,
      level,
      acceptMigrationClass: new Set([`level-${level + 1}`]),
      migrationClass: `level-${level}`,
    };
    mosaicAcc.relations[node.id] = { child: new Set(), parent: new Set() };
    mosaicData[node.id] = node;
    defaultIndicesCursor += 1;
  },
});

graph.traverse({
  onVisitNode: (node) => {
    if (node.children && node.children.length) {
      node.children.forEach((child) => {
        mosaicAcc.relations[node.id].child.add(child.id);
        mosaicAcc.relations[child.id].parent.add(node.id);
      });
    }
  },
});

const mosaicState = deepSignal<MosaicState>(mosaicAcc);

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
  render: (args: MosaicRootProps) => (
    <Mosaic.Root {...args} mosaic={mosaicState} Delegator={NavTreeItemDelegator}>
      <NavTreeRoot />
    </Mosaic.Root>
  ),
  decorators: [
    (Story: any) => (
      <Tooltip.Provider>
        <GraphContext.Provider value={{ graph }}>
          <SplitViewContext.Provider value={splitViewState}>
            <TreeViewContext.Provider value={treeViewState}>
              <Mosaic.Provider data={mosaicData}>
                <DensityProvider density='fine'>
                  <div role='none' className='p-2'>
                    <Story />
                  </div>
                </DensityProvider>
              </Mosaic.Provider>
            </TreeViewContext.Provider>
          </SplitViewContext.Provider>
        </GraphContext.Provider>
      </Tooltip.Provider>
    ),
  ],
};
