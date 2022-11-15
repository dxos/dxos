//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useIdentity } from '@dxos/react-client';

export interface RequireProfileProps {
  redirect: string;
}

/**
 * Prevents child routes from rendering if identity does not exist.
 * Redirects if identity is not present.
 */
export const RequireIdentity = ({ redirect: to }: RequireProfileProps) => {
  const { pathname, search } = useLocation();
  const identity = useIdentity();

  if (!identity) {
    return <Navigate to={`${to}?redirect=${pathname}${search}`} />;
  }

  return <Outlet />;
};
