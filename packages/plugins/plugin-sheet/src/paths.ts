//
// Copyright 2025 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';

import { Sheet } from '#types';

const { getSectionPath: getSheetsPath, getObjectPath: getSheetPath } = createTypeSectionPaths(Sheet.Sheet);

export { getSheetsPath, getSheetPath };
