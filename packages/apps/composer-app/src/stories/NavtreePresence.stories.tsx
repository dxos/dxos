//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Minus, Plus } from '@phosphor-icons/react';
import React from 'react';

import { SmallPresence } from '@braneframe/plugin-space';
import { Surface, SurfaceProvider } from '@dxos/app-framework';
import { isGraphNode, Graph, type NodeArg, type ActionData, ACTION_TYPE } from '@dxos/app-graph';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { Tooltip } from '@dxos/react-ui';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { NavTree, translations, treeNodeFromGraphNode, type TreeNode } from '@dxos/react-ui-navtree';
import { withTheme } from '@dxos/storybook-utils';

faker.seed(3);

const StorybookNavtreePresence = () => {};

const renderPresence = (node: TreeNode) => {
  if (isGraphNode(node)) {
    return <Surface role='presence' data={{ object: node.data }} />;
  }

  return null;
};

const defaultActions = (id = faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase()): NodeArg<ActionData>[] => [
  {
    id: `remove:${id}`,
    type: ACTION_TYPE,
    data: () => {},
    properties: {
      label: 'Remove',
      icon: () => <Minus />,
    },
  },
  {
    id: `add:${id}`,
    type: ACTION_TYPE,
    data: () => {},
    properties: {
      label: 'Add',
      icon: () => <Plus />,
      disposition: 'toolbar',
    },
  },
];

const createGraph = () => {
  const graph = new Graph();

  (graph as any)._addNodes(
    ...[...Array(2)].map((_, i) => ({
      id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
      data: {
        viewers: [...Array(faker.number.int(4))].map(() => ({
          identityKey: PublicKey.random(),
        })),
      },
      properties: {
        label: faker.lorem.words(2),
        description: faker.lorem.sentence(),
      },
      nodes: [
        ...defaultActions(),
        ...[...Array(2)].map((_, j) => ({
          id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
          data: {
            viewers: [...Array(faker.number.int(4))].map(() => ({
              identityKey: PublicKey.random(),
            })),
          },
          properties: {
            label: faker.lorem.words(2),
            description: faker.lorem.sentence(),
          },
          nodes: [
            ...defaultActions(),
            ...[...Array(2)].map((_, k) => ({
              id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
              data: {
                viewers: [...Array(faker.number.int(4))].map(() => ({
                  identityKey: PublicKey.random(),
                })),
              },
              properties: {
                label: faker.lorem.words(2),
                description: faker.lorem.sentence(),
              },
              nodes: defaultActions(),
            })),
          ],
        })),
      ],
    })),
  );

  return graph;
};

const graph = createGraph();
const tree = treeNodeFromGraphNode(graph, graph.root);

export const Demo = {
  render: () => {
    return (
      <Tooltip.Provider>
        <Mosaic.Root>
          <SurfaceProvider
            value={{
              components: {
                // @ts-ignore
                presence: ({ data: { object } }: { data: { object: any } }) => {
                  return <SmallPresence count={object?.viewers.length ?? 0} />;
                },
              },
            }}
          >
            <NavTree node={tree} renderPresence={renderPresence} />
          </SurfaceProvider>
        </Mosaic.Root>
      </Tooltip.Provider>
    );
  },
};

// TODO(burdon): Move to react-ui-navtree?
export default {
  title: 'composer-app/StorybookNavtreePresence',
  component: StorybookNavtreePresence,
  decorators: [withTheme],
  parameters: { translations },
};
