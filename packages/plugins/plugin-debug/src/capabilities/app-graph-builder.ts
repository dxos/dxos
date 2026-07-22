//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths } from '@dxos/app-toolkit';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { type Space } from '@dxos/react-client/echo';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { DebugNodes } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Top-level Debug node (sibling of DevTools under SYSTEM); only present when a space is active.
      GraphBuilder.createExtension({
        id: 'debug',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.system),
        connector: (space: Space) =>
          Effect.succeed([
            Node.make({
              id: DebugNodes.nodeId(DebugNodes.id),
              data: null,
              type: DebugNodes.id,
              properties: {
                label: ['debug.label', { ns: meta.profile.key }],
                icon: 'ph--bug--regular',
                position: Position.last,
              },
              nodes: [
                Node.make({
                  id: DebugNodes.nodeId(DebugNodes.SpaceType),
                  type: DebugNodes.SpaceType,
                  data: { space, type: DebugNodes.SpaceType },
                  properties: {
                    label: ['generate-objects.label', { ns: meta.profile.key }],
                    icon: 'ph--dice-five--regular',
                  },
                }),
              ],
            }),
          ]),
      }),

      // Debug object companion.
      GraphBuilder.createExtension({
        id: 'debugObject',
        match: NodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'debug',
              label: ['debug.label', { ns: meta.profile.key }],
              icon: 'ph--bug--regular',
              data: 'debug',
              position: Position.last,
            }),
          ]),
      }),

      // Object explorer deck companion.
      GraphBuilder.createExtension({
        id: 'spaceObjects',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'spaceObjects',
              label: ['space-objects.label', { ns: meta.profile.key }],
              icon: 'ph--cube--regular',
              data: 'space-objects' as const,
              position: Position.last,
            }),
          ]),
      }),
    ]);

    return Capability.provide(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
