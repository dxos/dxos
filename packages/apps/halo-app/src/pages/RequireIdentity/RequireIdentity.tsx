//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useProfile } from '@dxos/react-client';

export interface RequireProfileProps {
  redirect: string;
  inverse?: boolean;
}

/**
 * Prevents child routes from rendering if identity does not exist.
 * Redirects if identity is not present.
 * If inverse is true then the logic is reversed and it redirect only if the profile exists.
 */
export const RequireIdentity = ({
  redirect: to,
  inverse
}: RequireProfileProps) => {
  const { pathname, search } = useLocation();
  const profile = useProfile();

  if ((!inverse && !profile) || (inverse && profile)) {
    const redirect = inverse ? '' : `?redirect=${pathname}${search}`;
    return <Navigate to={`${to}${redirect}`} />;
  }

  return <Outlet />;
};
