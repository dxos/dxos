//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useEffect } from 'react';

import { createKeyPair } from '@dxos/crypto';

import { useClient, useProfile } from '../hooks';

/**
 * Automatically creates a profile.
 */
// TODO(burdon): Trigger HALO?
const ProfileInitializer = ({ children }: { children: ReactNode }) => {
  const client = useClient();
  const profile = useProfile();

  useEffect(() => {
    if (!profile) {
      client.createProfile(createKeyPair());
    }
  }, []);

  return <>{children}</>;
};

export default ProfileInitializer;
