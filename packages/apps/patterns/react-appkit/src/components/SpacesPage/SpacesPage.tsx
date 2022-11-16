//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useSpaces } from '@dxos/react-client';

import { SpaceList } from '../SpaceList';

export const SpacesPage = () => {
  const spaces = useSpaces();

  return <SpaceList spaces={spaces} />;
};
