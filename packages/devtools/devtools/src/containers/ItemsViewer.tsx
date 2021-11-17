//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { JsonTreeView } from '@dxos/react-components';

import { useDevtoolsHost } from '../contexts';
import { useStream } from '../hooks';

export const ItemsViewer = () => {
  const devtoolsHost = useDevtoolsHost();
  const result = useStream(() => devtoolsHost.SubscribeToItems({}));
  if (result === undefined || result.data === undefined) {
    return <div>Loading items...</div>;
  }

  console.log('!!!', result);

  // TODO(burdon): Change to table with proto results.
  return (
    <JsonTreeView
      size='small'
      depth={4}
      data={JSON.parse(result.data)}
    />
  );
};
