//
// Copyright 2021 DXOS.org
//

import React, { useContext } from 'react';

import { ProtoRpcClient } from '@dxos/rpc';
import { BackgroundService } from '@dxos/wallet-core';

import { useExtensionBackgroundService } from '../hooks';

const BackgroundContext = React.createContext<ProtoRpcClient<BackgroundService> | undefined>(undefined);

const useBackgroundContext = () => useContext(BackgroundContext);

const WithBackgroundContext = ({ children } : { children: React.ReactNode }) => {
  const { error, rpcClient } = useExtensionBackgroundService();

  if (error) {
    return <div> {error} </div>;
  }

  return (
    <BackgroundContext.Provider value={rpcClient}>
      {children}
    </BackgroundContext.Provider>
  );
};

export { WithBackgroundContext, useBackgroundContext };
