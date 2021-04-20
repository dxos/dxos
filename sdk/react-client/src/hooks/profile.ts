//
// Copyright 2020 DXOS.org
//

import { useState, useEffect } from 'react';

import { useClient } from './client';

export const useProfile = () => {
  const client = useClient();
  const [profile, setProfile] = useState(() => client.getProfile());

  useEffect(() =>
    client.subscribeToProfile(() => setProfile(client.getProfile())),
  [client]);

  return profile;
};
