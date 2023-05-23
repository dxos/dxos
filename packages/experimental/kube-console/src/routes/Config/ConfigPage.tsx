//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ConfigProto } from '@dxos/config';
import { JsonTree } from '@dxos/react-appkit';
import { useConfig } from '@dxos/react-client';

import { Toolbar } from '../../components';
import { useKube } from '../../hooks';

export const ConfigPage = () => {
  const config = useConfig();
  const kube = useKube();
  const [results, setResults] = useState<ConfigProto>({});

  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    const results = await kube.fetch('/dx/config');
    setResults(results);
  };

  // TODO(burdon): Tabs.
  // TODO(burdon): Bug: keys not shown.
  // TODO(burdon): All open by default.
  return (
    <div className='flex flex-col flex-1 overflow-y-scroll'>
      <div>
        <Toolbar>Console App</Toolbar>
        <JsonTree data={config.values} aria-labelledby='client_config' />
      </div>
      <div>
        <Toolbar>KUBE Server</Toolbar>
        <JsonTree data={results} aria-labelledby='server_config' />
      </div>
    </div>
  );
};
