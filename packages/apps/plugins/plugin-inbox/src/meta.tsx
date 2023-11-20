//
// Copyright 2023 DXOS.org
//

import { Envelope } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const INBOX_PLUGIN = 'dxos.org/plugin/inbox';

export default pluginMeta({
  id: INBOX_PLUGIN,
  name: 'Inbox',
  iconComponent: (props) => <Envelope {...props} />,
});
