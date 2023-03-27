//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ConfigProto } from '@dxos/config';
import { useConfig } from '@dxos/react-client';
import { JsonTree } from '@dxos/react-components';

import { Toolbar } from '../../components';
import { useKube } from '../../hooks';

export const ConfigPage = () => {
  const config = useConfig();
  const kube = useKube();
<<<<<<< HEAD
  const [results, setResults] = useState<any>({});
=======
  const [results, setResults] = useState<ConfigProto>({});
>>>>>>> main

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
        <JsonTree data={config.values} labelId='client_config' />
      </div>
      <div>
        <Toolbar>KUBE Server</Toolbar>
        <JsonTree data={results} labelId='server_config' />
      </div>
    </div>
  );
};
