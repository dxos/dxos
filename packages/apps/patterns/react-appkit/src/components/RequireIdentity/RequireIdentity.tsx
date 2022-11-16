//
// Copyright 2021 DXOS.org
//

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useIdentity } from '@dxos/react-client';

export interface RequireIdentityProps {
  redirect: string;
  inverse?: boolean;
}

/**
 * Prevents child routes from rendering if identity does not exist.
 * Redirects if identity is not present.
 * If inverse is true then the logic is reversed and it redirect only if the profile exists.
 */
export const RequireIdentity = ({ redirect: to }: RequireIdentityProps) => {
  const identity = useIdentity();

  useEffect(() => {
    if (!identity) {
      // TODO(wittjosiah): Remove hash.
      const redirect = `#?redirect=${window.location.href}`;
      window.location.replace(`${to}${redirect}`);
    }
  }, []);

  if (!identity) {
    return null;
  }

  return <Outlet />;
};
