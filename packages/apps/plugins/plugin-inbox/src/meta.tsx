//
// Copyright 2023 DXOS.org
//

import { Envelope } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

// TODO(burdon): Rename Mailbox?
export const INBOX_PLUGIN = 'dxos.org/plugin/inbox';

export default pluginMeta({
  id: INBOX_PLUGIN,
  name: 'Mailbox',
  iconComponent: (props) => <Envelope {...props} />,
});
