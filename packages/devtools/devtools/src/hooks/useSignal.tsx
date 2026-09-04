//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type SignalResponse } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { useDevtools } from '@dxos/react-client/devtools';

export const useSignal = (): SignalResponse[] => {
  const devtoolsHost = useDevtools();
  const [responses, setResponses] = useState<SignalResponse[]>([]);

  useEffect(() => {
    const stream = devtoolsHost.subscribeToSignal();
    const received: SignalResponse[] = [];
    stream.subscribe((response) => {
      received.push(response);
      setResponses([...received]);
    });

    return () => {
      void stream.close();
    };
  }, []);

  return responses;
};
