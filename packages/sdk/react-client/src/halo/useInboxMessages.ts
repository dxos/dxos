//
// Copyright 2026 DXOS.org
//

import { type InboxService } from '@dxos/protocols/rpc';
import { useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client/index.ts';

/**
 * Pending verified inbox messages for the local identity; not filtered by sender.
 */
export const useInboxMessages = (): readonly InboxService.InboxMessage[] => {
  const client = useClient();
  return useMulticastObservable(client.halo.inbox.messages);
};
