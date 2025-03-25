//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, type FC, type PropsWithChildren } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { useClient } from '@dxos/react-client';

import { Call } from './Call';
import { CallsGlobalContext } from '../hooks';
import { CallManager } from '../state';

export const CallGlobalContextProvider: FC<PropsWithChildren> = ({ children }) => {
  // Create a global live object containing the call state.
  const client = useClient();
  // TODO(mykola): Factor out to capability.
  const call = useMemo(() => new CallManager(client), [client]);

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      await call.open();
      ctx.onDispose(() => call.close());
    });

    return () => {
      void ctx.dispose();
    };
  }, [call]);

  return (
    <CallsGlobalContext.Provider value={{ call }}>
      <Call.Audio />
      <div className={'flex flex-col w-full h-full overflow-hidden'}>{children}</div>
    </CallsGlobalContext.Provider>
  );
};
