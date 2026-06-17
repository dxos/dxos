//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';
import { Channel } from '@dxos/types';

const { getSectionPath: getChannelsPath, getObjectPath: getChannelPath } = Paths.createTypeSectionPaths(
  Channel.Channel,
);

export { getChannelsPath, getChannelPath };
