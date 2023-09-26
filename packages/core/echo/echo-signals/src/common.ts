//
// Copyright 2023 DXOS.org
//

import { untracked, type signal, computed, effect, batch } from '@preact/signals-core';

import { registerSignalApi } from '@dxos/echo-schema';

export const constructRegisterSignalApi = (constructSignal: typeof signal) => () => {
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

  registerSignalApi({
    create: signalFactory,
    untracked,
    computed,
    effect,
    batch,
  });
};
