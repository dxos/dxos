//
// Copyright 2026 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Magazine } from '#types';

const { getSectionPath: getMagazinesPath, getObjectPath: getMagazinePath } = Paths.createTypeSectionPaths(
  Magazine.Magazine,
  { groupId: Paths.GroupSegments.content },
);

export { getMagazinesPath, getMagazinePath };
