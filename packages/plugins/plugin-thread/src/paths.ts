//
// Copyright 2025 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';
import { Channel } from '@dxos/types';

const { getSectionPath: getChannelsPath, getObjectPath: getChannelPath } = createTypeSectionPaths(Channel.Channel);

export { getChannelsPath, getChannelPath };
