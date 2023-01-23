//
// Copyright 2023 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client';

export const useSignal = () => {
  const devtoolsHost = useDevtools();
  const signalResponses = useMemo(() => {
    const signalOutput = devtoolsHost.subscribeToSignal();
    const signalResponses: SignalResponse[] = [];
    signalOutput.subscribe((response: SignalResponse) => {
      signalResponses.push(response);
      return [...signalResponses];
    });
  }, []);

  return signalResponses;
};
