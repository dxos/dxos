//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { type Space } from '@dxos/react-client/echo';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { DebugNodes, DebugOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const sampleSpacesAtom = yield* Capability.atom(AppCapabilities.SampleSpace);
    // Extension bodies run under `Effect.runSync`, where loading the demand-gated sample modules is
    // an async step the builder swallows as an empty result — so pull them in here instead, with the
    // atom above re-running the extension once they land.
    yield* Effect.ignore(Plugin.activate(ActivationEvents.SampleSpacesRequested));

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

      // Sample-space builder in the L0 app menu: seeding a space is the first thing a fresh profile
      // needs, so it must be reachable without first opening the debug node under SYSTEM. One action
      // per set rather than a submenu: `actionGroups` does not attach to the root node, and the
      // dropdown has no nested rendering, so a group would be invisible either way.
      AppGraphBuilder.createExtension({
        id: 'createSampleSpace',
        match: GraphNodeMatcher.whenRoot,
        actions: (_matched, get) =>
          Effect.gen(function* () {
            // Read the atom before any early return: the sample modules are demand-gated, so on a
            // cold app this runs while the list is still empty, and an early return that never
            // touched the atom would register no dependency and never re-run once they activate.
            get(sampleSpacesAtom);
            const samples = yield* Capability.getAll(AppCapabilities.SampleSpace);

            return samples.map((sample) =>
              AppGraphNode.makeAction({
                id: `createSampleSpace/${sample.id}`,
                data: Effect.fnUntraced(function* () {
                  const { subject } = yield* Operation.invoke(DebugOperation.CreateSampleSpace, { id: sample.id });
                  if (subject) {
                    yield* Operation.invoke(LayoutOperation.Open, { subject });
                  }
                }),
                properties: {
                  // Prefixed because the row sits among unrelated app-level actions; `sample.label`
                  // alone ("Northwind Sales") reads as an existing space rather than a builder.
                  label: ['create-sample-space.label', { ns: meta.profile.key, label: sample.label }],
                  icon: 'ph--dice-five--regular',
                  disposition: 'menu',
                },
              }),
            );
          }),
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
