//
// Copyright 2021 DXOS.org
//

import { useEffect, useState } from 'react';
import { browser, Runtime } from 'webextension-polyfill-ts';

export const useBackground = () => {
  const [port, setPort] = useState<Runtime.Port | undefined>(undefined);

  useEffect(() => {
    const connectedPort = browser.runtime.connect();
    setPort(connectedPort);

    return () => {
      connectedPort.disconnect();
    };
  }, []);

  return port;
};
