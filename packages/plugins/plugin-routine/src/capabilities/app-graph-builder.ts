//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { SETTINGS_SECTION_TYPE, SpaceOperation } from '@dxos/plugin-space';
import { SETTINGS_SECTION_ID } from '@dxos/plugin-space/types';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { Routine } from '#types';

import { getRoutinesPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      TypeSection.createTypeSectionExtension(Routine.Routine, {
        // Set here rather than via a schema annotation so the URL key does not leak into the
        // schema serialized in LLM prompts (memoized assistant conversations).
        urlKey: 'routine',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.ai),
        groupSegment: Paths.GroupSegments.ai,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: Type.getTypename(Routine.Routine),
            targetNodeId: getRoutinesPath(space.db.spaceId),
          }),
      }),
      GraphBuilder.createExtension({
        id: 'spaceSettingsAutomation',
        // Fixed automation panel at `root/<space>/settings/routines`; id-less (`routine` is already the
        // TypeSection key above, so the panel uses the plural `routines`).
        urlKey: 'routines',
        urlKeyHasId: false,
        urlPath: [SETTINGS_SECTION_ID],
        match: NodeMatcher.whenNodeType(SETTINGS_SECTION_TYPE),
        connector: () => {
          return Effect.succeed([
            AppNode.makeSettingsPanel({
              id: 'routines',
              type: `${meta.profile.key}.space-settings-automation`,
              label: ['automation-panel.label', { ns: meta.profile.key }],
              icon: 'ph--lightning--regular',
              iconHue: 'emerald',
              position: Position.last,
            }),
          ]);
        },
      }),
      GraphBuilder.createExtension({
        id: 'automationCompanion',
        match: NodeMatcher.whenEchoObjectMatches,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('automation'),
              label: ['automation-companion.label', { ns: meta.profile.key }],
              icon: 'ph--lightning--regular',
              data: 'automation',
              position: Position.last,
            }),
          ]),
      }),
      GraphBuilder.createTypeExtension({
        id: 'routineRuns',
        type: Routine.Routine,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'runs',
              label: ['routine-runs.label', { ns: meta.profile.key }],
              icon: 'ph--clock-countdown--regular',
              data: 'runs',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
