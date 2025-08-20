//
// Copyright 2022 DXOS.org
//

import { useSignalEffect } from '@preact-signals/safe-react';
import { type DependencyList, type EffectCallback, useEffect } from 'react';

export const useAsyncEffect = (
  cb: (controller: AbortController) => Promise<EffectCallback | void>,
  deps?: DependencyList,
) => {
  useEffect(() => {
    let effect: EffectCallback | void;
    const controller = new AbortController();
    void (async () => {
      if (!controller.signal.aborted) {
        effect = await cb(controller);
      }
    })();

    return () => {
      controller.abort();
      effect?.();
    };
  }, deps);
};

export const useAsyncSignalEffect = (cb: (controller: AbortController) => Promise<EffectCallback | void>) => {
  useSignalEffect(() => {
    let effect: EffectCallback | void;
    const controller = new AbortController();
    void (async () => {
      if (!controller.signal.aborted) {
        effect = await cb(controller);
      }
    })();

    return () => {
      controller.abort();
      effect?.();
    };
  });
};
