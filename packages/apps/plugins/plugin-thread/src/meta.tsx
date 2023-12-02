//
// Copyright 2023 DXOS.org
//

import { Chat } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';
export const THREAD_ITEM = `${THREAD_PLUGIN}/item`;

export default pluginMeta({
  id: THREAD_PLUGIN,
  name: 'Threads',
  iconComponent: (props) => <Chat {...props} />,
});
