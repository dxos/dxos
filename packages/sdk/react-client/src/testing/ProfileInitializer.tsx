//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useEffect } from 'react';

import { useClient } from '../client';
import { useIdentity } from '../halo';

let didInit = false;

/**
 * Automatically creates a random DXOS profile.
 */
// TODO(burdon): Replace with useTestProfile?
export const ProfileInitializer = ({ children }: { children: ReactNode }) => {
  const client = useClient();
  const profile = useIdentity();

  useEffect(() => {
    if (profile || didInit) {
      return;
    }

    didInit = true;
    void client.halo.createProfile();
  }, []);

  if (!profile) {
    return null;
  }

  return <>{children}</>;
};
