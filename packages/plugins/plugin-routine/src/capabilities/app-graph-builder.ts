//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Type } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getRoutinesPath } from '../paths.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      TypeSection.createTypeSectionExtension(Routine.Routine, {
        urlKey: 'routine',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
        groupSegment: GraphPath.GroupSegments.ai,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenObjectForm, {
            target: space.db,
            typename: Type.getTypename(Routine.Routine),
            targetNodeId: getRoutinesPath(space.db.spaceId),
          }),
      }),
      AppGraphBuilder.createExtension({
        id: 'spaceSettingsAutomation',
        url: { key: 'routines', kind: 'singleton', path: [SpaceSchema.SETTINGS_SECTION_ID] },
        match: GraphNodeMatcher.whenNodeType(SpaceSchema.SETTINGS_SECTION_TYPE),
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
      AppGraphBuilder.createTypeExtension({
        id: 'routineRuns',
        type: Routine.Routine,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: 'runs',
              label: ['routine-runs.label', { ns: meta.profile.key }],
              icon: 'ph--clock-countdown--regular',
              data: 'runs',
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
