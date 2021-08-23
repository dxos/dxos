//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { JsonTreeView } from '@dxos/react-framework';

import { useAsyncEffect } from '../hooks/async-effect';
import { useBridge } from '../hooks/bridge';

export default function ItemsViewer () {
  const [bridge] = useBridge();
  const [data, setData] = useState({});

  useAsyncEffect(async () => {
    const stream = await bridge.openStream('echo.items');

    stream.onMessage(data => {
      setData(data);
    });

    return () => stream.close();
  }, [bridge]);

  return (
    <JsonTreeView
      size='small'
      data={data}
      depth={4}
    />
  );
}
