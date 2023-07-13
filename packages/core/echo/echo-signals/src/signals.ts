//
// Copyright 2022 DXOS.org
//

// TODO(wittjosiah): Move to react-specific entry point.
import { signal } from '@preact/signals-react';

import { registerSignalFactory as register } from '@dxos/echo-schema';

export const registerSignalFactory = () =>
  register(() => {
    const _signal = signal({});

    return {
      notifyRead: () => {
        const _ = _signal.value;
      },
      notifyWrite: () => {
        _signal.value = {};
      },
    };
  });
