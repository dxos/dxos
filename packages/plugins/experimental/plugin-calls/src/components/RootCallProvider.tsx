//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React from 'react';

import { useDefaultValue } from '@dxos/react-ui';

import { CallManager } from '../call';

const CALLS_NAME = 'Calls';

type CallContextValue = {
  call: CallManager;
};

const [CallContextProvider, useCallContext] = createContext<CallContextValue>(CALLS_NAME, {
  call: new CallManager(),
});

const RootCallProvider = ({ call: propsCall, children }: { call: CallManager; children: React.ReactNode }) => {
  const call = useDefaultValue(propsCall, () => new CallManager());

  return <CallContextProvider call={call}>{children}</CallContextProvider>;
};

export { CALLS_NAME, type CallContextValue, RootCallProvider, useCallContext };
