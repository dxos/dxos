//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { JsonTreeView } from '@dxos/react-framework';

import { useDevtoolsHost } from '../contexts';

export default function ItemsViewer () {
  const devtoolsHost = useDevtoolsHost();
  const [data, setData] = useState({});

  useEffect(() => {
    const stream = devtoolsHost.SubscribeToItems({});

    stream?.subscribe(msg => setData(msg), () => {});

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
