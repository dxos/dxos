//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import { type Capability } from '@dxos/app-framework';
import { type BuilderExtensions } from '@dxos/app-graph';
import { log } from '@dxos/log';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { faker } from '@dxos/random';

export const storybookGraphBuilders = (context: Capability.PluginContext): BuilderExtensions => {
  const propertiesCache = new Map<string, Record<string, unknown>>();
  const getProperties = (id: string, defaults: Record<string, unknown>) => {
    const cached = propertiesCache.get(id);
    if (cached) {
      return cached;
    }

    propertiesCache.set(id, defaults);
    return defaults;
  };

  return [
    // Create app menu actions.
    GraphBuilder.createExtension({
      id: 'app-menu',
      match: NodeMatcher.whenRoot,
      actions: (node) => [
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
    GraphBuilder.createExtension({
      id: 'user-account',
      match: NodeMatcher.whenRoot,
      connector: () => [
        {
          id: 'user-account',
          type: 'user-account',
          properties: {
            label: 'User profile',
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
    GraphBuilder.createExtension({
      id: 'spaces-root',
      position: 'hoist',
      match: NodeMatcher.whenRoot,
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
    GraphBuilder.createExtension({
      id: 'spaces',
      match: NodeMatcher.whenId('spaces-root'),
      connector: (node, get) => {
        const count = Atom.make((get) => {
          let value = 3;
          const interval = setInterval(() => {
            if (value >= 10) {
              clearInterval(interval);
              return;
            }

            value++;
            get.setSelf(value);
          }, 5000);
          get.addFinalizer(() => clearInterval(interval));
          return value;
        });

        return [
          ...Array.from({ length: get(count) }, (_, i) => ({
            id: `space-${i}`,
            type: 'space',
            properties: getProperties(`space-${i}`, {
              label: `Space ${i}`,
              icon: faker.properties.icon(),
              hue: faker.properties.hue(),
            }),
          })),
        ];
      },
    }),
    // Create space actions.
    GraphBuilder.createExtension({
      id: 'space-actions',
      match: NodeMatcher.whenNodeType('space'),
      actions: (node) => [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `${node.id}/action-${i}`,
          data: () => {
            log.info('action', { id: node.id, index: i });
          },
          properties: getProperties(`${node.id}/action-${i}`, {
            label: `Action ${i}`,
            icon: faker.properties.icon(),
          }),
        })),
      ],
    }),
    // Create object nodes.
    GraphBuilder.createExtension({
      id: 'objects',
      match: NodeMatcher.whenNodeType('space'),
      connector: (node, get) => {
        const count = Atom.make((get) => {
          let value = 3;
          const interval = setInterval(() => {
            if (value >= 20) {
              clearInterval(interval);
              return;
            }

            value++;
            get.setSelf(value);
          }, 5000);
          get.addFinalizer(() => clearInterval(interval));
          return value;
        });

        return [
          ...Array.from({ length: get(count) }, (_, i) => ({
            id: `${node.id}/object-${i}`,
            type: 'object',
            properties: getProperties(`${node.id}/object-${i}`, {
              label: `Object ${i}`,
              icon: faker.properties.icon(),
            }),
          })),
        ];
      },
    }),
    // Create object actions.
    GraphBuilder.createExtension({
      id: 'object-actions',
      match: NodeMatcher.whenNodeType('object'),
      actions: (node) => [
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `${node.id}/action-${i}`,
          data: () => {
            log.info('action', { id: node.id, index: i });
          },
          properties: getProperties(`${node.id}/action-${i}`, {
            label: `Action ${i}`,
            icon: faker.properties.icon(),
          }),
        })),
      ],
    }),
  ];
};
