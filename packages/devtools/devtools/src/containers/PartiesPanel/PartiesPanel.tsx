//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useDevtools, useStream } from '@dxos/react-client';

import { PartyTable } from '../../components/index.js';

export const PartiesPanel = () => {
  const devtoolsHost = useDevtools();
  const { parties } = useStream(() => devtoolsHost.subscribeToParties({}), {});
  if (parties === undefined) {
    return null;
  }

  return (
    <PartyTable
      parties={parties}
    />
  );
};
