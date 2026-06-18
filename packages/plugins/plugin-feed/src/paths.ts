//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Magazine } from '#types';

const { getSectionPath: getMagazinesPath, getObjectPath: getMagazinePath } = Paths.createTypeSectionPaths(
  Magazine.Magazine,
);

export { getMagazinesPath, getMagazinePath };
