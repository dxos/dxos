//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { Magazine } from '#types';

const { getSectionPath: getMagazinesPath, getObjectPath: getMagazinePath } = GraphPath.createTypeSectionPaths(
  Magazine.Magazine,
  { groupId: GraphPath.GroupSegments.content },
);

export { getMagazinePath, getMagazinesPath };
