//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useDevtools, useStream } from '@dxos/react-client';

import { SpaceTable } from '../../components';

export const SpacesPanel = () => {
  const devtoolsHost = useDevtools();
  const { parties } = useStream(() => devtoolsHost.subscribeToParties({}), {});
  if (parties === undefined) {
    return null;
  }

  return <SpaceTable parties={parties} />;
};
