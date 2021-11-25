//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { useStream } from '../hooks';

export const ItemsViewer = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const result = useStream(() => devtoolsHost.SubscribeToItems({}));
  if (result === undefined || result.data === undefined) {
    return <div>Loading items...</div>;
  }

  // TODO(burdon): Change to table with proto results.
  return (
    <JsonTreeView
      size='small'
      depth={4}
      data={JSON.parse(result.data)}
    />
  );
};
