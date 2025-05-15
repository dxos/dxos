//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { faker } from '@dxos/random';

export const storybookGraphBuilders = [
  // Create app menu actions.
  createExtension({
    id: 'app-menu',
    filter: (node): node is Node<null> => node.id === 'root',
    actions: ({ node }) => [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `${node.id}/action-${i}`,
        data: () => {
          log.info('action', { id: node.id, index: i });
        },
        properties: {
          label: `Action ${i}`,
          icon: faker.properties.icon(),
          disposition: 'menu',
        },
      })),
    ],
  }),
  // Create user account node.
  createExtension({
    id: 'user-account',
    filter: (node): node is Node<null> => node.id === 'root',
    connector: () => [
      {
        id: 'user-account',
        type: 'user-account',
        properties: {
          label: 'User Account',
          icon: 'ph--user--regular',
          disposition: 'user-account',
          userId: '1234567890ABCDEF',
          hue: faker.properties.hue(),
          emoji: faker.properties.emoji(),
          status: 'active',
        },
        nodes: [
          {
            id: 'profile',
            type: 'profile',
            properties: {
              label: 'Profile',
              icon: 'ph--user--regular',
            },
          },
          {
            id: 'devices',
            type: 'devices',
            properties: {
              label: 'Devices',
              icon: 'ph--devices--regular',
            },
          },
          {
            id: 'security',
            type: 'security',
            properties: {
              label: 'Security',
              icon: 'ph--key--regular',
            },
          },
        ],
      },
    ],
  }),
  // TODO(wittjosiah): This group node probably is unnecessary now with the flat L0 structure.
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
