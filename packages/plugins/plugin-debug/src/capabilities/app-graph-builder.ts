//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { type Space } from '@dxos/react-client/echo';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { DebugNodes } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Top-level Debug node (sibling of DevTools under SYSTEM); only present when a space is active.
      AppGraphBuilder.createExtension({
        id: 'debug',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.system),
        connector: (space: Space) =>
          Effect.succeed([
            AppGraphNode.make({
              id: DebugNodes.nodeId(DebugNodes.id),
              data: null,
              type: DebugNodes.id,
              properties: {
                label: ['debug.label', { ns: meta.profile.key }],
                icon: 'ph--bug--regular',
                position: Position.last,
              },
              nodes: [
                AppGraphNode.make({
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
      AppGraphBuilder.createExtension({
        id: 'debugObject',
        match: AppNodeMatcher.whenEchoObject,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'debug',
              label: ['debug.label', { ns: meta.profile.key }],
              icon: 'ph--bug--regular',
              data: 'debug',
              position: Position.last,
            }),
          ]),
      }),

      // Object explorer deck companion.
      AppGraphBuilder.createExtension({
        id: 'spaceObjects',
        match: GraphNodeMatcher.whenRoot,
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

      // Log panel deck companion.
      AppGraphBuilder.createExtension({
        id: 'logs',
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'logs',
              label: ['logs.label', { ns: meta.profile.key }],
              icon: 'ph--list-magnifying-glass--regular',
              data: 'logs' as const,
              position: Position.last,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
