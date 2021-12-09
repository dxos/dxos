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
  if (result === undefined || result.data === undefined) {
    return <div>Loading parties...</div>;
  }

  return (
    <JsonTreeView
      size='small'
      depth={4}
      data={JSON.parse(result.data)}
    />
  );
};
