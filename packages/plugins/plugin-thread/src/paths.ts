//
// Copyright 2025 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';
import { Channel } from '@dxos/types';

const { getSectionPath: getChannelsPath, getObjectPath: getChannelPath } = GraphPath.createTypeSectionPaths(
  Channel.Channel,
  { groupId: GraphPath.GroupSegments.communications },
);

export { getChannelPath, getChannelsPath };
