//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Routine from '@dxos/compute/Routine';

import { meta } from '#meta';

const { getSectionPath: getRoutinesPath } = GraphPath.createTypeSectionPaths(Routine.Routine, {
  groupId: GraphPath.GroupSegments.ai,
});

/** Path to the routines settings section for a given space. */
export const getRoutinesSettingsPath = (spaceId: string): string =>
  GraphPath.getSpacePath(spaceId, 'settings', `${meta.profile.key}.routines`);

export { getRoutinesPath };
