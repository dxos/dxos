//
// Copyright 2023 DXOS.org
//

import type { signal } from '@preact/signals-core';

import { registerSignalFactory } from '@dxos/echo-schema';

export const constructRegisterSignalFactory = (constructSignal: typeof signal) => () => {
  const signalFactory = () => {
    const signal = constructSignal({});

    return {
      notifyRead: () => {
        const _ = signal.value;
      },
      notifyWrite: () => {
        signal.value = {};
      },
    };
  };

  registerSignalFactory(signalFactory);
};
