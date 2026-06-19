//
// Copyright 2026 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Automation } from '#types';

const { getSectionPath: getAutomationsPath, getObjectPath: getAutomationPath } = Paths.createTypeSectionPaths(
  Automation.Automation,
);

/** Path to the automations settings section for a given space. */
export const getAutomationsSettingsPath = (spaceId: string): string =>
  Paths.getSpacePath(spaceId, 'settings', `${meta.id}.automations`);

export { getAutomationsPath, getAutomationPath };
