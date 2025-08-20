//
// Copyright 2022 DXOS.org
//

import { useSignalEffect } from '@preact-signals/safe-react';
import { type DependencyList, type EffectCallback, useEffect } from 'react';

/**
 * Async version of useEffect.
 * The `AbortController` can be used to detect if the component has been unmounted and
 * can be used to propagate abort signals to downstream async operations (e.g., `fetch`).
 */
export const useAsyncEffect = (
  cb: (controller: AbortController) => Promise<EffectCallback | void>,
  deps?: DependencyList,
) => {
  useEffect(() => {
    const controller = new AbortController();
    let effect: EffectCallback | void;
    const t = setTimeout(async () => {
      if (!controller.signal.aborted) {
        effect = await cb(controller);
      }
    });

    return () => {
      clearTimeout(t);
      controller.abort();
      effect?.();
    };
  }, deps ?? []);
};

/**
 * Combines useSignalEffect with useAsyncEffect.
 */
export const useAsyncSignalEffect = (cb: (controller: AbortController) => Promise<EffectCallback | void>) => {
  useSignalEffect(() => {
    const controller = new AbortController();
    let effect: EffectCallback | void;
    const t = setTimeout(async () => {
      if (!controller.signal.aborted) {
        effect = await cb(controller);
      }
    });

    return () => {
      clearTimeout(t);
      controller.abort();
      effect?.();
    };
  });
};
