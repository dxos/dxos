//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useDevtools, useStream } from '@dxos/react-client';

import { PartyTable } from '../../components';

export const SpacesPanel = () => {
  const devtoolsHost = useDevtools();
  const { parties } = useStream(() => devtoolsHost.subscribeToParties({}), {});
  console.log('parties: ', parties);
  if (parties === undefined) {
    return null;
  }

  return <PartyTable parties={parties} />;
};
