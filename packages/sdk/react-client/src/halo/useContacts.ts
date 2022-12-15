//
// Copyright 2020 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { useClient } from '../client';

/**
 * Returns all known Contacts across all Spaces.
 * Contacts are known members of a common Space.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useContacts = () => {
  const client = useClient();
  const result = useMemo(() => client.halo.queryContacts(), [client]);
  const contacts = useSyncExternalStore(result.subscribe, () => result.value);

  return { contacts };
};
