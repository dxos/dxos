//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

export const ConfigView = () => {
  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const [config, setConfig] = useState<any>(undefined);

  useEffect(() => {
    void (async () => {
      const config = await devtoolsHost.GetConfig();
      config.config && setConfig(JSON.parse(config.config));
    })();
  }, []);

  return (
    <JsonTreeView
      size='small'
      depth={4}
      data={config}
    />
  );
};
