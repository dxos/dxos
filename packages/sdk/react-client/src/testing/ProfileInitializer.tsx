//
// Copyright 2020 DXOS.org
//

import React, { useEffect } from 'react';

import { useClient, useProfile } from '../hooks';

/**
 * Automatically creates a random DXOS profile.
 * @deprecated
 */
// TODO(burdon): Testing-only (set as debug option for ClientProvider?)
export const ProfileInitializer = ({ children }: { children: React.ReactNode }) => {
  const client = useClient();
  const profile = useProfile();

  useEffect(() => {
    if (!profile) {
      setImmediate(async () => {
        await client.halo.createProfile();
      });
    }
  }, []);

  if (!profile) {
    return null;
  }

  return <>{children}</>;
};
