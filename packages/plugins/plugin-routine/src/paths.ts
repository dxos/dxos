//
// Copyright 2026 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Routine } from '#types';

const { getSectionPath: getRoutinesPath } = Paths.createTypeSectionPaths(Routine.Routine, {
  groupId: Paths.GroupSegments.ai,
});

/** Path to the routines settings section for a given space. */
export const getRoutinesSettingsPath = (spaceId: string): string =>
  Paths.getSpacePath(spaceId, 'settings', `${meta.profile.key}.routines`);

export { getRoutinesPath };
