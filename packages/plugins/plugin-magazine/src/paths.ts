//
// Copyright 2026 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';

import { Magazine } from '#types';

const { getSectionPath: getMagazinesPath, getObjectPath: getMagazinePath } = GraphPath.createTypeSectionPaths(
  Magazine.Magazine,
  { groupId: GraphPath.GroupSegments.content },
);

export { getMagazinePath, getMagazinesPath };
