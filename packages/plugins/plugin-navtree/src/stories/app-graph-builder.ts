//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { faker } from '@dxos/random';

export const storybookGraphBuilders = [
  // Create spaces group node.
  createExtension({
    id: 'spaces-root',
    position: 'hoist',
    filter: (node): node is Node<null> => node.id === 'root',
    connector: () => [
      {
        id: 'spaces-root',
        type: 'spaces-root',
        properties: {
          label: 'Spaces',
          icon: 'ph--planet--regular',
          role: 'branch',
          disposition: 'collection',
        },
      },
    ],
  }),
  // Create space nodes.
  createExtension({
    id: 'spaces',
    filter: (node): node is Node<null> => node.id === 'spaces-root',
    connector: () => [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `space-${i}`,
        type: 'space',
        properties: {
          label: `Space ${i}`,
          icon: faker.properties.icon(),
          hue: faker.properties.hue(),
        },
      })),
    ],
  }),
  // Create space actions.
  createExtension({
    id: 'space-actions',
    filter: (node): node is Node<null> => node.type === 'space',
    actions: ({ node }) => [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `${node.id}/action-${i}`,
        data: () => {
          log.info('action', { id: node.id, index: i });
        },
        properties: {
          label: `Action ${i}`,
          icon: faker.properties.icon(),
        },
      })),
    ],
  }),
  // Create object nodes.
  createExtension({
    id: 'objects',
    filter: (node): node is Node<null> => node.type === 'space',
    connector: () => [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `object-${i}`,
        type: 'object',
        properties: {
          label: `Object ${i}`,
          icon: faker.properties.icon(),
        },
      })),
    ],
  }),
  // Create object actions.
  createExtension({
    id: 'object-actions',
    filter: (node): node is Node<null> => node.type === 'object',
    actions: ({ node }) => [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `${node.id}/action-${i}`,
        data: () => {
          log.info('action', { id: node.id, index: i });
        },
        properties: {
          label: `Action ${i}`,
          icon: faker.properties.icon(),
        },
      })),
    ],
  }),
];
