//
// Copyright 2020 DXOS.org
//

import { useState, useEffect } from 'react';

import { useClient } from '../client';

/**
 * Hook returning DXOS identity object.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useIdentity = () => {
  const client = useClient();
  const [identity, setIdentity] = useState(() => client.halo.profile);

  useEffect(() => client.halo.subscribeToProfile(() => setIdentity(client.halo.profile)), [client]);
  return identity;
};
