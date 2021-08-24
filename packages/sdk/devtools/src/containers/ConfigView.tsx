//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { JsonTreeView } from '@dxos/react-framework';

import { useBridge } from '../hooks/bridge';

export const ConfigView = () => {
  const [bridge] = useBridge();
  const [config, setConfig] = useState(undefined);

  useEffect(() => {
    bridge.getConfig().then(setConfig).catch(console.error);
  }, []);

  return (
    <JsonTreeView
      size='small'
      depth={4}
      data={config}
    />
  );
};
