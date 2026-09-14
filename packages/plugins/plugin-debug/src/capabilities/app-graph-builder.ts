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

/** The panel's own pages, first in the tree: the console and the log viewer. */
export const createDebugToolsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'debugTools',
    match: AppNodeMatcher.whenDebugGroup,
    connector: () =>
      Effect.succeed([
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
      ]),
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // The hidden root/debug category and its first-class pages (console, logs).
      createDebugRootExtension(),
      createDebugToolsExtension(),

      // Top-level Debug node, under the debug category.
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
                position: Position.last,
              },
              nodes: [
                AppGraphNode.make({
                  id: DebugNodes.nodeId(DebugNodes.SpaceType),
                  type: DebugNodes.SpaceType,
                  data: DebugNodes.SpaceType,
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
