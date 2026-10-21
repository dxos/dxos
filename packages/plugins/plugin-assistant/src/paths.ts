//
// Copyright 2025 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Session from '@dxos/assistant/Session';

const { getSectionPath: getChatsPath, getObjectPath: getChatPath } = GraphPath.createTypeSectionPaths(Session.Session, {
  groupId: GraphPath.GroupSegments.ai,
});

export { getChatPath, getChatsPath };
