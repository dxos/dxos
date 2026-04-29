//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, createObjectNode } from '@dxos/app-toolkit';
import { type Space, getSpace, isSpace } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space/meta';
import { SPACE_TYPE } from '@dxos/plugin-space/types';

import { meta } from '#meta';

import { Integration } from '../types';

const whenSpace = (node: Node.Node): Option.Option<Space> =>
  node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none();

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const resolve = (typename: string) =>
      capabilities.getAll(AppCapabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

    const extensions = yield* Effect.all([
      // Existing: contribute an Integrations panel into space settings.
      GraphBuilder.createExtension({
        id: 'space-settings',
        match: NodeMatcher.whenNodeType(`${spaceMeta.id}.settings`),
        connector: (node) =>
          Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'integrations',
              type: `${meta.id}.space-settings`,
              label: ['space-panel.name', { ns: meta.id }],
              icon: 'ph--plugs--regular',
            }),
          ]),
      }),

      // Surface Integration objects as nodes under each space.
      GraphBuilder.createExtension({
        id: 'integrations',
        match: whenSpace,
        connector: (space, get) => {
          const integrations = get(AtomQuery.make(space.db, Filter.type(Integration.Integration)));
          if (integrations.length === 0) {
            return Effect.succeed([]);
          }

          return Effect.succeed([
            Node.make({
              id: 'integrations',
              type: 'integrations',
              data: 'integrations-root',
              properties: {
                label: ['integrations-branch.label', { ns: meta.id }],
                icon: 'ph--plugs-connected--regular',
                role: 'branch',
                position: 'hoist',
              },
              nodes: integrations
                .map((integration) =>
                  createObjectNode({
                    db: space.db,
                    object: integration,
                    resolve,
                  }),
                )
                .filter((node): node is NonNullable<typeof node> => node !== null),
            }),
          ]);
        },
      }),

      // Per-Integration: surface its targets[*].object as children.
      GraphBuilder.createExtension({
        id: 'integration-targets',
        match: (node) =>
          Integration.instanceOf(node.data) ? Option.some(node.data as Integration.Integration) : Option.none(),
        connector: (integration, get) => {
          const space = getSpace(integration);
          if (!space) {
            return Effect.succeed([]);
          }
          const children = (integration.targets ?? [])
            .map((target) => get(AtomRef.make(target.object)))
            .filter((obj): obj is NonNullable<typeof obj> => obj != null)
            .map((obj) =>
              createObjectNode({
                db: space.db,
                object: obj,
                resolve,
              }),
            )
            .filter((node): node is NonNullable<typeof node> => node !== null);

          return Effect.succeed(children);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
