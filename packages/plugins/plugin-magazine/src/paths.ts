//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import * as Magazine from './types/Magazine';

const { getSectionPath: getMagazinesPath, getObjectPath: getMagazinePath } = GraphPath.createTypeSectionPaths(
  Magazine.Magazine,
  { groupId: GraphPath.GroupSegments.content },
);

export { getMagazinePath, getMagazinesPath };
