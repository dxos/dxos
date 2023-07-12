//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { SignalResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools } from '@dxos/react-client';

import { PanelContainer } from '../../components';
import { SignalMessages } from './SignalMessages';
import { SignalStatusInfo } from './SignalStatusInfo';

const SignalPanel = () => {
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

  return (
    <PanelContainer className='divide-y space-y-2'>
      <SignalStatusInfo />
      <SignalMessages messages={signalResponses} />
    </PanelContainer>
  );
};

export default SignalPanel;
