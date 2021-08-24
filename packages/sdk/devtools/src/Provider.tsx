//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { DevtoolsBridge } from './bridge';

interface ContextValue {
  bridge: DevtoolsBridge,
}

export const Context = React.createContext<ContextValue | undefined>(undefined);

export interface ProviderProps {
  bridge: DevtoolsBridge
  children?: ReactNode
}

const Provider = ({ bridge, children }: ProviderProps) => {
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    bridge.on('api', (ready) => {
      setReady(ready);
      setInitialized(true);
    });
  }, [bridge]);

  return (
    <>
      {!initialized && (
        <div style={{ padding: 8 }}>Waiting for DXOS client...</div>
      )}

      {ready && (
        <Context.Provider value={{ bridge }}>
          {children}
        </Context.Provider>
      )}

      {(!ready && initialized) && (
        <div>DXOS client not found.</div>
      )}
    </>
  );
};

export default Provider;
