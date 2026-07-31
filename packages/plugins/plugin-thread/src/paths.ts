//
// Copyright 2025 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { Channel } from '@dxos/types';

const { getSectionPath: getChannelsPath, getObjectPath: getChannelPath } = GraphPath.createTypeSectionPaths(
  Channel.Channel,
  { groupId: GraphPath.GroupSegments.communications },
);

export { getChannelPath, getChannelsPath };
