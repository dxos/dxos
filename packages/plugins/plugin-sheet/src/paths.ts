//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Sheet } from '#types';

const { getSectionPath: getSheetsPath, getObjectPath: getSheetPath } = Paths.createTypeSectionPaths(Sheet.Sheet);

export { getSheetsPath, getSheetPath };
