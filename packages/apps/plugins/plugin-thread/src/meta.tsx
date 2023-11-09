//
// Copyright 2023 DXOS.org
//

import { Chat } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';

export default pluginMeta({
  id: THREAD_PLUGIN,
  name: 'Thread',
  iconComponent: (props) => <Chat {...props} />,
});
