//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Type } from '@dxos/echo';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { SETTINGS_SECTION_TYPE, SpaceOperation } from '@dxos/plugin-space';
import { SETTINGS_SECTION_ID } from '@dxos/plugin-space/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';

import { getRoutinesPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      TypeSection.createTypeSectionExtension(Routine.Routine, {
        urlKey: 'routine',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
        groupSegment: GraphPath.GroupSegments.ai,
        createObject: (space) =>
          Operation.invoke(SpaceOperation.OpenCreateObject, {
            target: space.db,
            typename: Type.getTypename(Routine.Routine),
            targetNodeId: getRoutinesPath(space.db.spaceId),
          }),
      }),
      GraphBuilder.createExtension({
        id: 'spaceSettingsAutomation',
        url: { key: 'routines', kind: 'singleton', path: [SETTINGS_SECTION_ID] },
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
              variant: 'automation',
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
