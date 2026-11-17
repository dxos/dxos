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
import * as ReadOnly from '@dxos/app-toolkit/ReadOnly';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Type } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';
import * as Position from '@dxos/util/Position';

import { RoutineNamespace } from '../namespace.ts';
import { ROUTINES_SETTINGS_ID, getRoutinesPath } from '../paths.ts';

/** The routines panel in each space's settings section. */
export const createRoutinesSettingsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'spaceSettingsAutomation',
    url: { key: 'routines', kind: 'singleton', path: [SpaceSchema.SETTINGS_SECTION_ID] },
    match: GraphNodeMatcher.whenNodeType(SpaceSchema.SETTINGS_SECTION_TYPE),
    connector: () => {
      return Effect.succeed([
        AppNode.makeSettingsPanel({
          id: ROUTINES_SETTINGS_ID,
          type: `${RoutineNamespace.key}.space-settings-automation`,
          label: ['automation-panel.label', { ns: RoutineNamespace.key }],
          icon: 'ph--lightning--regular',
          iconHue: 'emerald',
          position: Position.last,
        }),
      ]);
    },
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const readOnly = yield* ReadOnly.atom;
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
      createRoutinesSettingsExtension(),
      AppGraphBuilder.createTypeExtension({
        id: 'routineRuns',
        relation: AppNode.companion,
        type: Routine.Routine,
        // Runs are this device's history, and a read-only host runs nothing.
        connector: (_, get) =>
          Effect.succeed(
            get(readOnly)
              ? []
              : [
                  AppNode.makeCompanion({
                    variant: 'runs',
                    label: ['routine-runs.label', { ns: RoutineNamespace.key }],
                    icon: 'ph--clock-countdown--regular',
                    data: 'runs',
                  }),
                ],
          ),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
