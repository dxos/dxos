//
// Copyright 2021 DXOS.org
//

import React, { useContext } from 'react';

import { DevtoolsHost } from '../proto';

interface WithDevtoolsHostContextProps {
  devtoolsHost: DevtoolsHost,
  children: React.ReactNode
}

const DevtoolsHostContext = React.createContext<DevtoolsHost | undefined>(undefined);

const useDevtoolsHost = () => {
  const context = useContext(DevtoolsHostContext);
  if (!context) {
    throw new Error('Devtools host context is not provided');
  }
  return context;
};

const WithDevtoolsHostContext = ({ devtoolsHost, children } : WithDevtoolsHostContextProps) => {
  return (
    <DevtoolsHostContext.Provider value={devtoolsHost}>
      {children}
    </DevtoolsHostContext.Provider>
  );
};

export { WithDevtoolsHostContext, useDevtoolsHost };
