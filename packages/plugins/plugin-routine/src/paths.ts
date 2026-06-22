//
// Copyright 2026 DXOS.org
//

import { AppNode, Paths } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Routine } from '#types';

const { getSectionPath: getRoutinesPath } = Paths.createTypeSectionPaths(Routine.Routine, {
  groupId: AppNode.NAV_TREE_GROUP_AI_ID,
});

/** Path to the automations settings section for a given space. */
export const getRoutinesSettingsPath = (spaceId: string): string =>
  Paths.getSpacePath(spaceId, 'settings', `${meta.profile.key}.automations`);

export { getRoutinesPath };
