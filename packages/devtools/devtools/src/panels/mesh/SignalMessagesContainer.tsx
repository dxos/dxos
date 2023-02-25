//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client';

import { SignalMessages } from './SignalMessages';

const SignalMessagesContainer = () => {
  const devtoolsHost = useDevtools();
  const [signalResponses, setSignalResponses] = useState<SignalResponse[]>([]);
  useEffect(() => {
    const signalOutput = devtoolsHost.subscribeToSignal();
    const signalResponses: SignalResponse[] = [];
    signalOutput.subscribe((response: SignalResponse) => {
      signalResponses.push(response);
      setSignalResponses([...signalResponses]);
    });

    return () => {
      signalOutput.close();
    };
  }, []);
  return <SignalMessages messages={signalResponses} />;
};

export default SignalMessagesContainer;
