//
// Copyright 2020 DXOS.org
//

import React, { useEffect } from 'react';

import { useClient, useProfile } from '../hooks';

/**
 * Automatically creates a random DXOS profile.
 * @deprecated
 */
// TODO(burdon): Testing-only.
export const ProfileInitializer = ({ children }: { children: React.ReactNode }) => {
  const client = useClient();
  const profile = useProfile();

  useEffect(() => {
    if (!profile) {
      void client.halo.createProfile();
    }
  }, []);

  if (!profile) {
    return null;
  }

  return <>{children}</>;
};
