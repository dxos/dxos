//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';
import { Timer } from '@dxos/async';

import { DEBUG_PLUGIN } from '../meta';
import { DebugContext } from '../types';

export default () =>
  contributes(Capabilities.ReactContext, {
    id: DEBUG_PLUGIN,
    context: ({ children }) => {
      const [timer, setTimer] = useState<Timer>();
      useEffect(() => timer?.state.on((value) => !value && setTimer(undefined)), [timer]);
      useEffect(() => {
        timer?.stop();
      }, []);

      return (
        <DebugContext.Provider
          value={{
            running: !!timer,
            start: (cb, options) => {
              timer?.stop();
              setTimer(new Timer(cb).start(options));
            },
            stop: () => timer?.stop(),
          }}
        >
          {children}
        </DebugContext.Provider>
      );
    },
  });
