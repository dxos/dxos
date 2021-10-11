//
// Copyright 2020 DXOS.org
//

import { useState, useEffect } from 'react';

import { useClient } from './useClient';

/**
 * Hook returning DXOS user profile object.
 * To be used with `ClientProvider` or `ClientInitializer` component wrapper.
 */
export const useProfile = () => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.getProfile());

  useEffect(() => {
    return client.halo.subscribeToProfile(() => setProfile(client.halo.getProfile()))
  }, [client]);

  return profile;
};
