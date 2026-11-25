//
// Copyright 2025 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Agent from '@dxos/compute/Agent';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = GraphPath.createTypeSectionPaths(Agent.Session, {
  groupId: GraphPath.GroupSegments.ai,
});

export { getChatPath, getChatsPath };
