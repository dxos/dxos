//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import urlJoin from 'url-join';

import { useProfile } from '@dxos/react-client';

export interface RequireProfileProps {
  redirect: string
}

/**
 * Prevents child routes from rendering if profile does not exist.
 * Redirects if profile is not present.
 */
export const RequireProfile = ({ redirect }: RequireProfileProps) => {
  const { pathname, search } = useLocation();
  const profile = useProfile();

  if (!profile) {
    return (
      <Navigate to={urlJoin(redirect, pathname, search)} />
    );
  }

  return (
    <Outlet />
  );
};
