//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';

import { PartyTable } from '../components';
import { useStream } from '../hooks';

export const PartiesPanel = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const result = useStream(() => devtoolsHost.SubscribeToParties({}));
  if (result === undefined || result.parties === undefined) {
    return null;
  }

  return (
    <PartyTable
      // TODO(burdon): Type.
      parties={result.parties as any}
    />
  );
};
