//
// Copyright 2020 DXOS.org
//

import { useState, useEffect } from 'react';

import { useClient } from './useClient';

/**
 * Hook returning DXOS user profile object.
 * Requires ClientConext to be set via ClientProvider.
 */
export const useProfile = () => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.profile);

  useEffect(() => {
    return client.halo.subscribeToProfile(() => setProfile(client.halo.profile));
  }, [client]);

  return profile;
};
