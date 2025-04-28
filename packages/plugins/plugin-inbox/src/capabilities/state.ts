//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { InboxCapabilities } from './capabilities';

export default () => {
  const state = live<InboxCapabilities.MailboxState>({});
  return contributes(InboxCapabilities.MailboxState, state);
};
