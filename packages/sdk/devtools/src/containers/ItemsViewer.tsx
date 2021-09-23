//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-framework';

import { useDevtoolsHost } from '../contexts';

export default function ItemsViewer () {
  const devtoolsHost = useDevtoolsHost();
  const [data, setData] = useState<any>();

  useEffect(() => {
    const stream = devtoolsHost.SubscribeToItems({});

    stream?.subscribe(msg => {
      msg.data && setData(JSON.parse(msg.data));
    }, () => {});

    return stream?.close
  }, []);

  return (
    <JsonTreeView
      size='small'
      data={data}
      depth={4}
    />
  );
}
