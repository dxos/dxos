//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { type Capability } from '@dxos/app-framework';
import { type BuilderExtensions } from '@dxos/app-graph';
import { log } from '@dxos/log';
import { GraphBuilder } from '@dxos/plugin-graph';
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
    GraphBuilder.createExtensionRaw({
      id: 'app-menu',
      connector: (node) => Atom.make(() => []),
      actions: (node) =>
        Atom.make(() =>
          Array.from({ length: 5 }, (_, i) => ({
            id: `app-menu/action-${i}`,
            data: Effect.fnUntraced(function* () {
              log.info('action', { id: 'app-menu', index: i });
            }),
            properties: {
              label: `Action ${i}`,
              icon: faker.properties.icon(),
              disposition: 'menu',
            },
          })),
        ),
    }),
    // Create user account node.
    GraphBuilder.createExtensionRaw({
      id: 'user-account',
      connector: (node) =>
        Atom.make(() => [
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
        ]),
    }),
    // TODO(wittjosiah): This group node probably is unnecessary now with the flat L0 structure.
    // Create spaces group node.
    GraphBuilder.createExtensionRaw({
      id: 'spaces-root',
      position: 'hoist',
      connector: (node) =>
        Atom.make(() => [
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
        ]),
    }),
    // Create space nodes.
    GraphBuilder.createExtensionRaw({
      id: 'spaces',
      connector: (node) =>
        Atom.make((get) => {
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
        }),
    }),
    // Create space actions.
    GraphBuilder.createExtensionRaw({
      id: 'space-actions',
      connector: (node) => Atom.make(() => []),
      actions: (node) =>
        Atom.make(() =>
          Array.from({ length: 5 }, (_, i) => ({
            id: `space-actions/action-${i}`,
            data: Effect.fnUntraced(function* () {
              log.info('action', { id: 'space-actions', index: i });
            }),
            properties: getProperties(`space-actions/action-${i}`, {
              label: `Action ${i}`,
              icon: faker.properties.icon(),
            }),
          })),
        ),
    }),
    // Create object nodes.
    GraphBuilder.createExtensionRaw({
      id: 'objects',
      connector: (node) =>
        Atom.make((get) => {
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
              id: `object-${i}`,
              type: 'object',
              properties: getProperties(`object-${i}`, {
                label: `Object ${i}`,
                icon: faker.properties.icon(),
              }),
            })),
          ];
        }),
    }),
    // Create object actions.
    GraphBuilder.createExtensionRaw({
      id: 'object-actions',
      connector: (node) => Atom.make(() => []),
      actions: (node) =>
        Atom.make(() =>
          Array.from({ length: 5 }, (_, i) => ({
            id: `object-actions/action-${i}`,
            data: Effect.fnUntraced(function* () {
              log.info('action', { id: 'object-actions', index: i });
            }),
            properties: getProperties(`object-actions/action-${i}`, {
              label: `Action ${i}`,
              icon: faker.properties.icon(),
            }),
          })),
        ),
    }),
  ];
};
