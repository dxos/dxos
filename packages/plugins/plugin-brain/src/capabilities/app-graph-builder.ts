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
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { MEMORY_COMPANION_ID, MEMORY_SECTION_ID, MEMORY_SECTION_TYPE } from '../constants.ts';
import { BrainNamespace } from '../namespace.ts';

/**
 * The memory view in two places: a "Memory" section under each space's settings, and a panel in the deck's context
 * sidebar, where it sits beside a chat so the agent's queries can be watched as it runs them.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'memorySection',
        url: { key: MEMORY_SECTION_ID, kind: 'singleton', path: [SpaceSchema.SETTINGS_SECTION_ID] },
        match: AppNodeMatcher.whenSpaceSettings,
        connector: (space) =>
          Effect.succeed([
            AppGraphNode.make({
              id: MEMORY_SECTION_ID,
              type: MEMORY_SECTION_TYPE,
              data: MEMORY_SECTION_TYPE,
              properties: {
                label: ['memory-section.label', { ns: BrainNamespace.key }],
                icon: 'ph--brain--regular',
                iconHue: 'emerald',
                draggable: false,
                droppable: false,
                space,
                testId: 'brainPlugin.memorySection',
              },
            }),
          ]),
      }),
      AppGraphBuilder.createExtension({
        id: 'memoryCompanion',
        relation: AppNode.companion,
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: MEMORY_COMPANION_ID,
              label: ['memory-section.label', { ns: BrainNamespace.key }],
              icon: 'ph--brain--regular',
              data: null,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
