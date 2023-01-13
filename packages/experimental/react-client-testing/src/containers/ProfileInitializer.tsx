//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { useClient, useIdentity } from '@dxos/react-client';

/**
 * Automatically creates a random DXOS profile.
 */
// TODO(burdon): Replace with useTestProfile?
export const ProfileInitializer = ({ children }: { children: ReactNode }) => {
  const client = useClient();
  const profile = useIdentity();

  useAsyncEffect(async () => {
    if (!profile) {
      await client.halo.createProfile();
    }
  }, []);

  if (!profile) {
    return null;
  }

  return <>{children}</>;
};
