//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { type SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client/devtools';

export const useSignal = () => {
  const devtoolsHost = useDevtools();
  const signalResponses = useMemo(() => {
    const signalOutput = devtoolsHost.subscribeToSignal({} as any);
    const signalResponses: SignalResponse[] = [];
    signalOutput.subscribe((response: any) => {
      signalResponses.push(response);
    });
  }, []);

  return signalResponses;
};
