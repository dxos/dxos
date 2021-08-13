//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { JsonTreeView } from '@dxos/react-ux';

import { useAsyncEffect } from '../hooks/async-effect';
import { useBridge } from '../hooks/bridge';

export default function SnapshotsView () {
  const [bridge] = useBridge();
  const [data, setData] = useState<any[]>([]);

  useAsyncEffect(async () => {
    const stream = await bridge.openStream('echo.snapshots');

    stream.onMessage(data => {
      setData(data);
    });

    return () => stream.close();
  }, [bridge]);

  if (data.length === 0) {
    return (
    <p>No snapshots available.</p>
    );
  }

  return (
    <JsonTreeView
      size='small'
      data={data}
      depth={4}
    />
  );
}
