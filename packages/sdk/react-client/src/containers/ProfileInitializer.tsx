//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useEffect } from 'react';

import { useClient, useProfile } from '../hooks';

/**
 * Automatically creates a random DXOS profile.
 */
// TODO(burdon): Trigger HALO?
const ProfileInitializer = ({ children }: { children: ReactNode }) => {
  const client = useClient();
  const profile = useProfile();

  useEffect(() => {
    if (!profile) {
      void client.halo.createProfile();
    }
  }, []);

  return <>{children}</>;
};

export default ProfileInitializer;
