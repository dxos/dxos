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
export const useTestProfile = () => {
  const client = useClient();
  const profile = useIdentity();

  useEffect(() => {
    if (profile || didInit) {
      return;
    }

    didInit = true;
    void client.halo.createProfile();
  }, []);

  return profile;
};

/**
 * Automatically creates a random DXOS profile and renders children.
 */
export const ProfileInitializer = ({ children }: { children: ReactNode }) => {
  const profile = useTestProfile();

  if (!profile) {
    return null;
  }

  return <>{children}</>;
};
