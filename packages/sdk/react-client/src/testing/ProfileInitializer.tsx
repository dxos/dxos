//
// Copyright 2020 DXOS.org
//

import React, { type ReactNode, useEffect } from 'react';

import { useClient } from '../client';
import { type Identity, useIdentity } from '../halo';

let didInit = false;

/**
 * Automatically creates a random DXOS profile.
 */
export const useTestProfile = (): Identity | null => {
  const client = useClient();
  const profile = useIdentity();

  useEffect(() => {
    if (profile || didInit) {
      return;
    }

    didInit = true;
    void client.halo.createIdentity();
  }, []);

  return profile;
};

/**
 * Automatically creates a random DXOS profile and renders children.
 */
// TODO(wittjosiah): Just use `onInitialized` in `ClientProvider`?
export const ProfileInitializer = ({ children }: { children: ReactNode }) => {
  const profile = useTestProfile();

  if (!profile) {
    return null;
  }

  return <>{children}</>;
};
