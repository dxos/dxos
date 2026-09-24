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
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { DebugNodes } from '#types';

/** The hidden category every developer tool hangs off: a root child the main navtree filters out. */
export const createDebugRootExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'debugRoot',
    match: GraphNodeMatcher.whenRoot,
    connector: () =>
      Effect.succeed([
        AppGraphNode.make({
          id: GraphPath.GroupSegments.debug,
          type: GraphPath.GroupTypes.debug,
          data: null,
          properties: {
            label: ['debug-panel.title', { ns: meta.profile.key }],
            icon: 'ph--bug--regular',
            disposition: 'hidden',
            draggable: false,
            droppable: false,
          },
        }),
      ]),
  });

/** The Debug node: the console and log viewer first (what the panel opened on as tabs), then the generator. */
export const createDebugExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'debug',
    match: AppNodeMatcher.whenDebugGroup,
    connector: () =>
      Effect.succeed([
        AppGraphNode.make({
          id: DebugNodes.nodeId(DebugNodes.id),
          data: null,
          type: DebugNodes.id,
          properties: {
            label: ['debug.label', { ns: meta.profile.key }],
            icon: 'ph--bug--regular',
            // Before DevTools (10), whichever plugin registers first: the panel's own pages lead the tree.
            position: 0,
          },
          nodes: [
            AppGraphNode.make({
              id: DebugNodes.nodeId(DebugNodes.Console),
              type: DebugNodes.Console,
              data: DebugNodes.Console,
              properties: {
                label: ['console.tab.label', { ns: meta.profile.key }],
                icon: 'ph--terminal-window--regular',
                // Explicit (not Position.first): -Infinity + 1 collapses back to -Infinity, tying with logs.
                position: 0,
              },
            }),
            AppGraphNode.make({
              id: DebugNodes.nodeId(DebugNodes.Logs),
              type: DebugNodes.Logs,
              data: DebugNodes.Logs,
              properties: {
                label: ['logs.tab.label', { ns: meta.profile.key }],
                icon: 'ph--list-bullets--regular',
                position: 1,
              },
            }),
            AppGraphNode.make({
              id: DebugNodes.nodeId(DebugNodes.SpaceType),
              type: DebugNodes.SpaceType,
              data: DebugNodes.SpaceType,
              properties: {
                label: ['generate-objects.label', { ns: meta.profile.key }],
                icon: 'ph--dice-five--regular',
                position: 2,
              },
            }),
          ],
        }),
      ]),
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // The hidden root/debug category.
      createDebugRootExtension(),

      // The Debug node, under the debug category: the panel's own pages, then the generator.
      createDebugExtension(),
      // Debug object companion.
      AppGraphBuilder.createExtension({
        id: 'debugObject',
        relation: AppNode.companion,
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
        relation: AppNode.companion,
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'spaceObjects',
              label: ['space-objects.label', { ns: meta.profile.key }],
              icon: 'ph--cube--regular',
              data: 'space-objects' as const,
              position: Position.last,
              mount: 'open',
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
