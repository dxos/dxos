//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { useStream } from '../hooks';

export const PartiesViewer = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const result = useStream(() => devtoolsHost.SubscribeToParties({}));
  if (result === undefined || result.parties === undefined) {
    return <div>Loading parties...</div>;
  }

  const parties = result.parties.map(party => ({
    ...party,
    timeframe: party.timeframe?.toJSON()
  }));

  return (
    <JsonTreeView
      size='small'
      depth={4}
      data={parties}
    />
  );
};
