//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { type BuilderExtensions } from '@dxos/app-graph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { log } from '@dxos/log';
import { random } from '@dxos/random';

export const storybookGraphBuilders = (): BuilderExtensions => {
  const propertiesCache = new Map<string, Record<string, unknown>>();
  const getProperties = (id: string, defaults: Record<string, unknown>) => {
    const cached = propertiesCache.get(id);
    if (cached) {
      return cached;
    }

    propertiesCache.set(id, defaults);
    return defaults;
  };

  return Effect.runSync(
    Effect.all([
      // Create app menu actions.
      AppGraphBuilder.createExtension({
        id: 'appMenu',
        match: GraphNodeMatcher.whenRoot,
        actions: () =>
          Effect.succeed(
            Array.from({ length: 5 }, (_, i) => ({
              id: `action-${i}`,
              data: Effect.fnUntraced(function* () {
                log.info('action', { id: 'app-menu', index: i });
              }),
              properties: {
                label: `Action ${i}`,
                icon: random.properties.icon(),
                disposition: 'menu',
              },
            })),
          ),
      }),
      // Create user account node.
      AppGraphBuilder.createExtension({
        id: 'userAccount',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppGraphNode.make({
              id: 'user-account',
              type: 'user-account',
              properties: {
                label: 'User profile',
                icon: 'ph--user--regular',
                disposition: 'user-account',
                userId: '1234567890ABCDEF',
                hue: random.properties.hue(),
                emoji: random.properties.emoji(),
                status: 'active',
              },
              nodes: [
                AppGraphNode.make({
                  id: 'profile',
                  type: 'profile',
                  properties: {
                    label: 'Profile',
                    icon: 'ph--user--regular',
                  },
                }),
                AppGraphNode.make({
                  id: 'devices',
                  type: 'devices',
                  properties: {
                    label: 'Devices',
                    icon: 'ph--devices--regular',
                  },
                }),
                AppGraphNode.make({
                  id: 'security',
                  type: 'security',
                  properties: {
                    label: 'Security',
                    icon: 'ph--key--regular',
                  },
                }),
              ],
            }),
          ]),
      }),
      // Create space (workspace) nodes directly under root.
      AppGraphBuilder.createExtension({
        id: 'spaces',
        match: GraphNodeMatcher.whenRoot,
        connector: (_, get) =>
          Effect.sync(() => {
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

            return Array.from({ length: get(count) }, (_, i) =>
              AppGraphNode.make({
                id: `space-${i}`,
                type: 'space',
                properties: getProperties(`space-${i}`, {
                  label: `Space ${i}`,
                  icon: random.properties.icon(),
                  hue: random.properties.hue(),
                  disposition: 'workspace',
                }),
              }),
            );
          }),
      }),
      // Create space actions.
      AppGraphBuilder.createExtension({
        id: 'spaceActions',
        match: GraphNodeMatcher.whenNodeType('space'),
        actions: () =>
          Effect.succeed(
            Array.from({ length: 5 }, (_, i) => ({
              id: `action-${i}`,
              data: Effect.fnUntraced(function* () {
                log.info('action', { id: 'space-actions', index: i });
              }),
              properties: getProperties(`action-${i}`, {
                label: `Action ${i}`,
                icon: random.properties.icon(),
              }),
            })),
          ),
      }),
      // Create object nodes.
      AppGraphBuilder.createExtension({
        id: 'objects',
        match: GraphNodeMatcher.whenNodeType('space'),
        connector: (_, get) =>
          Effect.sync(() => {
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

            return Array.from({ length: get(count) }, (_, i) =>
              AppGraphNode.make({
                id: `object-${i}`,
                type: 'object',
                properties: getProperties(`object-${i}`, {
                  label: `Object ${i}`,
                  icon: random.properties.icon(),
                  ...(i % 3 === 0 && { count: (i + 1) * 2 }),
                  ...(i % 3 === 1 && { modifiedCount: i + 1 }),
                }),
              }),
            );
          }),
      }),
      // Create object actions.
      AppGraphBuilder.createExtension({
        id: 'objectActions',
        match: GraphNodeMatcher.whenNodeType('object'),
        actions: () =>
          Effect.succeed(
            Array.from({ length: 5 }, (_, i) => ({
              id: `action-${i}`,
              data: Effect.fnUntraced(function* () {
                log.info('action', { id: 'objectActions', index: i });
              }),
              properties: getProperties(`action-${i}`, {
                label: `Action ${i}`,
                icon: random.properties.icon(),
              }),
            })),
          ),
      }),
    ]),
  );
};
