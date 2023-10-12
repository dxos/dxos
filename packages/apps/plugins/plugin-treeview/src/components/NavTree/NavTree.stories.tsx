//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { getIndices } from '@tldraw/indices';
import { deepSignal } from 'deepsignal/react';
import React, { forwardRef, Ref } from 'react';

import { GraphContext, GraphBuilder } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { DensityProvider, Tooltip } from '@dxos/aurora';
import { DelegatorProps, getDndId, Mosaic, MosaicState, parseDndId, TreeItemTileProps } from '@dxos/aurora-grid';

import { NavTreeRoot } from './NavTree';
import { NavTreeItemDelegator } from './NavTreeItem';
import { TreeViewContext } from '../../TreeViewContext';
import { getLevel } from '../../util';

faker.seed(1234);
const fake = faker.helpers.fake;

export default {
  component: NavTreeRoot,
  argTypes: { onMosaicChange: { action: 'mosaic changed' } },
};

// TODO(burdon): Move file global variables into object.

const createGraph = () => {
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

  return buildGraph(new GraphBuilder().build(), 'tree', content);
};

const graph = createGraph();

const defaultIndices = getIndices(99);

const navTreeId = 'navTree';

const createState = () => {
  let defaultIndicesCursor = 0;

  const mosaicStateValue: MosaicState = {
    tiles: {},
    relations: {},
  };

  graph.traverse({
    visitor: (node) => {
      const level = getLevel(node, -1);
      const id = getDndId(navTreeId, node.id);
      mosaicStateValue.tiles[id] = {
        id,
        index: defaultIndices[defaultIndicesCursor],
        variant: 'treeitem',
        sortable: true,
        expanded: false,
        level,
        acceptMigrationClass: new Set([`level-${level + 1}`]),
        migrationClass: `level-${level}`,
      } as TreeItemTileProps;
      mosaicStateValue.relations[id] = { child: new Set(), parent: new Set() };
      defaultIndicesCursor += 1;
    },
  });

  graph.traverse({
    visitor: (node) => {
      const id = getDndId(navTreeId, node.id);
      if (node.children && node.children.length) {
        node.children.forEach((child) => {
          const childId = getDndId(navTreeId, child.id);
          mosaicStateValue.relations[id].child.add(childId);
          mosaicStateValue.relations[childId].parent.add(id);
        });
      }
    },
  });

  return mosaicStateValue;
};

const mosaicState = deepSignal<MosaicState>(createState());

const StorybookNavTreeItemDelegator = forwardRef<HTMLElement, DelegatorProps>((props, forwardedRef) => (
  <NavTreeItemDelegator data={props} ref={forwardedRef as Ref<HTMLOListElement>} />
));

export const Default = {
  render: () => (
    <Mosaic.Provider
      mosaic={mosaicState}
      getData={(dndId) => {
        const [_, entityId] = parseDndId(dndId);
        return graph.findNode(entityId);
      }}
      copyTile={(id, _toId, mosaic) => ({ ...mosaic.tiles[id] })}
      Delegator={StorybookNavTreeItemDelegator}
    >
      <Mosaic.Root id={navTreeId}>
        <NavTreeRoot />
      </Mosaic.Root>
    </Mosaic.Provider>
  ),
  decorators: [
    (Story: any) => (
      <Tooltip.Provider>
        <GraphContext.Provider value={{ graph }}>
          <TreeViewContext.Provider value={{}}>
            <DensityProvider density='fine'>
              <div role='none' className='p-2'>
                <Story />
              </div>
            </DensityProvider>
          </TreeViewContext.Provider>
        </GraphContext.Provider>
      </Tooltip.Provider>
    ),
  ],
};
