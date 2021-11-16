//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { JsonTreeView } from '@dxos/react-components';

import { useDevtoolsHost } from '../contexts';
import { useStream } from '../hooks';

export const ItemsViewer = () => {
  const devtoolsHost = useDevtoolsHost();
  const data = useStream(() => devtoolsHost.SubscribeToItems({}));

  if (data === undefined) {
    return <div> Loading items... </div>;
  }

  if (data.data === undefined) {
    return <div> No items to display. </div>;
  }

  return (
    <JsonTreeView
      size='small'
      data={JSON.parse(data.data)}
      depth={4}
    />
  );
};
