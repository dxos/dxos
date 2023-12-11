//
// Copyright 2023 DXOS.org
//

import { Envelope, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

// TODO(burdon): Rename.
export const INBOX_PLUGIN = 'dxos.org/plugin/inbox';

export default pluginMeta({
  id: INBOX_PLUGIN,
  name: 'Inbox',
  description: 'Manages your email, calendar, and contacts.',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <Envelope {...props} />,
});
