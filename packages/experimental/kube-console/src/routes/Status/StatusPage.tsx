//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button } from '@dxos/react-components';

import { Toolbar } from '../../components';
import { useKube } from '../../hooks';

export const StatusPage = () => {
  const kube = useKube();
  const [results, setResults] = useState<any>();
  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = async () => {
    const results = await kube.fetch('/dx/status');
    setResults(results);
  };

  return (
    // TODO(burdon): Factor out panel layout.
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar>
        <Button onClick={handleRefresh}>Refresh</Button>
      </Toolbar>

      {/* TODO(burdon): Factor out results table with scrollbar. */}
      <div className='flex flex-col flex-1 overflow-y-scroll'>
        {results && <pre className='m-2'>{JSON.stringify(results, undefined, 2)}</pre>}
      </div>
    </div>
  );
};
