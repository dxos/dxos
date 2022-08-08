//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { Client } from '../packlets/proxy';

export default {
  title: 'client/singleton'
};

export const Primary = () => {
  const client = useMemo(() => new Client(), []);

  useEffect(() => {
    void client.initialize();
  }, [client]);

  return (
    <pre>
      {JSON.stringify({
        initialized: client.initialized,
        ...(client.initialized ? client.info : {})
      })}
    </pre>
  );
};
