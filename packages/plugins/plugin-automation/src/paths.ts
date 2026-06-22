//
// Copyright 2026 DXOS.org
//

import { AppNode, Paths } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Automation } from '#types';

const { getSectionPath: getAutomationsPath } = Paths.createTypeSectionPaths(Automation.Automation, {
  groupId: AppNode.NAV_TREE_GROUP_AI_ID,
});

/** Path to the automations settings section for a given space. */
export const getAutomationsSettingsPath = (spaceId: string): string =>
  Paths.getSpacePath(spaceId, 'settings', `${meta.profile.key}.automations`);

export { getAutomationsPath };
