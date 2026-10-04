//
// Copyright 2026 DXOS.org
//

import { type InboxService } from '@dxos/protocols/rpc';
import { useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client/index.ts';

/**
 * Pending verified inbox notices for the local identity; not filtered by sender.
 */
export const useInboxNotices = (): readonly InboxService.Notice[] => {
  const client = useClient();
  return useMulticastObservable(client.halo.inbox.notices);
};
