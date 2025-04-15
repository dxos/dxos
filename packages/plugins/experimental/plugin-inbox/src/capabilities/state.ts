//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { InboxCapabilities } from './capabilities';

export default () => {
  const state = create<InboxCapabilities.MailboxState>({});

  return contributes(InboxCapabilities.MailboxState, state);
};
