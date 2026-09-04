//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type SignalResponse } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { useDevtools } from '@dxos/react-client/devtools';

/** The signal stream is unbounded and the panel only ever shows its tail. */
const MAX_RESPONSES = 500;

export const useSignal = (): SignalResponse[] => {
  const devtoolsHost = useDevtools();
  const [responses, setResponses] = useState<SignalResponse[]>([]);

  useEffect(() => {
    setResponses([]);
    const stream = devtoolsHost.subscribeToSignal();
    stream.subscribe((response) => {
      setResponses((previous) => [...previous, response].slice(-MAX_RESPONSES));
    });

    return () => {
      void stream.close();
    };
  }, [devtoolsHost]);

  return responses;
};
