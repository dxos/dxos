//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';
import { browser } from 'webextension-polyfill-ts';

import { RpcClient, wrapPort } from '../../services';

export const useRpcClient = () => {
  const [client, setClient] = useState<RpcClient | undefined>(undefined);

  useEffect(() => {
    const connectedPort = browser.runtime.connect();

    const client = new RpcClient(wrapPort(connectedPort))

    setClient(client);

    return () => {
      client.close();
      connectedPort.disconnect();
    };
  }, []);

  return client;
};
