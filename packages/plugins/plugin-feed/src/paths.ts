//
// Copyright 2025 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';

import { Magazine } from '#types';

const { getSectionPath: getMagazinesPath, getObjectPath: getMagazinePath } = createTypeSectionPaths(Magazine.Magazine);

export { getMagazinesPath, getMagazinePath };
