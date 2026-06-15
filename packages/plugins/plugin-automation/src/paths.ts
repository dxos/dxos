//
// Copyright 2026 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';

import { Automation } from '#types';

const { getSectionPath: getAutomationsPath, getObjectPath: getAutomationPath } = createTypeSectionPaths(
  Automation.Automation,
);

export { getAutomationsPath, getAutomationPath };
