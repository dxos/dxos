//
// Copyright 2020 DXOS.org
//

import { useState, useEffect } from 'react';

import { useClient } from './useClient';

export const useProfile = () => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.halo.getProfile());

  useEffect(() =>
    client.halo.subscribeToProfile(() => setProfile(client.halo.getProfile())),
  [client]);

  return profile;
};
