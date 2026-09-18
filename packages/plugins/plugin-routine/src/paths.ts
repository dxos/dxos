//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Routine from '@dxos/compute/Routine';
import * as SpaceSchema from '@dxos/plugin-space/SpaceSchema';

const { getSectionPath: getRoutinesPath } = GraphPath.createTypeSectionPaths(Routine.Routine, {
  groupId: GraphPath.GroupSegments.ai,
});

/** Segment of the routines panel within a space's settings section. */
export const ROUTINES_SETTINGS_ID = 'routines';

/** Path to the routines settings panel for a given space. */
export const getRoutinesSettingsPath = (spaceId: string): string =>
  GraphPath.getSpacePath(spaceId, SpaceSchema.SETTINGS_SECTION_ID, ROUTINES_SETTINGS_ID);

export { getRoutinesPath };
