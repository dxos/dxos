//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { type PluginContext } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { type BuilderExtensions, ROOT_ID, createExtension } from '@dxos/plugin-graph';
import { faker } from '@dxos/random';

export const storybookGraphBuilders = (context: PluginContext): BuilderExtensions => {
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
    createExtension({
      id: 'app-menu',
      actions: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => {
              return [
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    // Create user account node.
    createExtension({
      id: 'user-account',
      connector: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              return [
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    // TODO(wittjosiah): This group node probably is unnecessary now with the flat L0 structure.
    // Create spaces group node.
    createExtension({
      id: 'spaces-root',
      position: 'hoist',
      connector: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              return [
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    // Create space nodes.
    createExtension({
      id: 'spaces',
      connector: (node) => {
        const count = Rx.make((get) => {
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

        return Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === 'spaces-root' ? Option.some(node) : Option.none())),
            Option.map(() => {
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
            Option.getOrElse(() => []),
          ),
        );
      },
    }),
    // Create space actions.
    createExtension({
      id: 'space-actions',
      actions: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.type === 'space' ? Option.some(node) : Option.none())),
            Option.map((node) => {
              return [
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    // Create object nodes.
    createExtension({
      id: 'objects',
      connector: (node) => {
        const count = Rx.make((get) => {
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

        return Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.type === 'space' ? Option.some(node) : Option.none())),
            Option.map((node) => {
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
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),
    // Create object actions.
    createExtension({
      id: 'object-actions',
      actions: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.type === 'object' ? Option.some(node) : Option.none())),
            Option.map((node) => {
              return [
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
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ];
};
