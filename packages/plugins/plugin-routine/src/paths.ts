//
// Copyright 2026 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';
import { Routine } from '@dxos/compute';

import { meta } from '#meta';

const { getSectionPath: getRoutinesPath } = GraphPath.createTypeSectionPaths(Routine.Routine, {
  groupId: GraphPath.GroupSegments.ai,
});

/** Path to the routines settings section for a given space. */
export const getRoutinesSettingsPath = (spaceId: string): string =>
  GraphPath.getSpacePath(spaceId, 'settings', `${meta.profile.key}.routines`);

export { getRoutinesPath };
