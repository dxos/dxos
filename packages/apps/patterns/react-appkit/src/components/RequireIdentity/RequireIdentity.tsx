//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useIdentity, useClient } from '@dxos/react-client';

export interface RequireIdentityProps {
  redirect?: string;
  inverse?: boolean;
}

/**
 * Prevents child routes from rendering if identity does not exist.
 * Redirects if identity is not present. Requires a ClientProvider ancestor.
 * If inverse is true then the logic is reversed and it redirect only if the profile exists.
 */
export const RequireIdentity = ({ redirect: to }: RequireIdentityProps) => {
  const client = useClient();
  const identity = useIdentity();
  // TODO(wittjosiah): Separate config for HALO UI & vault so origin doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from the config.
  const remoteSource = new URL(client.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');
  useEffect(() => {
    if (!identity) {
      // TODO(wittjosiah): Remove hash.
      const redirect = `#?redirect=${encodeURIComponent(window.location.href)}`;
      window.location.replace(`${to ?? remoteSource.origin}${redirect}`);
    }
  }, []);

  if (!identity) {
    return null;
  }

  return <Outlet />;
};
