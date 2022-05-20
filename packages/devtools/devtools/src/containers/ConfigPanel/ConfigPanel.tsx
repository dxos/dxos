//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

export const ConfigPanel = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const [config, setConfig] = useState<any>(undefined);

  useAsyncEffect(async () => {
    const config = await devtoolsHost.getConfig();
    config.config && setConfig(JSON.parse(config.config));
  }, []);

  return (
    <JsonTreeView
      size='small'
      depth={4}
      data={config}
    />
  );
};
