//
// Copyright 2026 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Automation } from '#types';

const { getSectionPath: getAutomationsPath, getObjectPath: getAutomationPath } = Paths.createTypeSectionPaths(
  Automation.Automation,
);

export { getAutomationsPath, getAutomationPath };
