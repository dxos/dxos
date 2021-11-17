//
// Copyright 2021 DXOS.org
//

import React, { useContext } from 'react';

import { DevtoolsHost } from '../proto';

interface WithDevtoolsHostContextProps {
  devtoolsHost: DevtoolsHost,
  children: React.ReactNode
}

const UseDevtoolsHost = React.createContext<DevtoolsHost | undefined>(undefined);

export const useDevtoolsHost = () => {
  const context = useContext(UseDevtoolsHost);
  if (!context) {
    throw new Error('DevtoolsHostContext not set.');
  }

  return context;
};

// TODO(burdon): Why wrap this?
export const WithDevtoolsHostContext = ({ devtoolsHost, children } : WithDevtoolsHostContextProps) => {
  return (
    <UseDevtoolsHost.Provider value={devtoolsHost}>
      {children}
    </UseDevtoolsHost.Provider>
  );
};
