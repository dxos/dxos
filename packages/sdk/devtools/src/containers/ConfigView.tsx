//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { JsonTreeView } from '@dxos/react-framework';

import { useDevtoolsHost } from '../contexts';

export const ConfigView = () => {
  const devtoolsHost = useDevtoolsHost();
  const [config, setConfig] = useState<any>(undefined);

  useEffect(() => {
    void (async () => {
      const config = await devtoolsHost.GetConfig({});
      config.config && setConfig(JSON.parse(config.config));
    })();
  }, []);

  return (
    <JsonTreeView
      size="small"
      depth={4}
      data={config}
    />
  );
};
