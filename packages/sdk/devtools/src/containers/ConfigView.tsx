//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { JsonTreeView } from '@dxos/react-framework';

import { useDevtoolsHost } from '../contexts';

export const ConfigView = () => {
  const devtoolsHost = useDevtoolsHost();
  const [config, setConfig] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const config = await devtoolsHost.GetConfig({});
      setConfig(config.config);
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
