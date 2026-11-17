//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

import { MEMORY_SECTION_ID, MEMORY_SECTION_TYPE } from '../constants.ts';
import { BrainNamespace } from '../namespace.ts';

/** A "Memory" section under each space's settings, beside its agents and connections, opening the memory view. */
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
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
