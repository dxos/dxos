//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, type FC, type PropsWithChildren } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { useClient } from '@dxos/react-client';

import { CallsGlobalContext } from '../hooks';
import { CallManager } from '../state';

export const CallGlobalContextProvider: FC<PropsWithChildren> = ({ children }) => {
  // Create a global live object containing the call state.
  const client = useClient();
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

  return <CallsGlobalContext.Provider value={{ call }}>{children}</CallsGlobalContext.Provider>;
};
