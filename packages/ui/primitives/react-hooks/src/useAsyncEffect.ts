//
// Copyright 2022 DXOS.org
//

import { effect } from '@preact-signals/safe-react';
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
    let cleanup: EffectCallback | void;
    const t = setTimeout(async () => {
      if (!controller.signal.aborted) {
        cleanup = await cb(controller);
      }
    });

    return () => {
      clearTimeout(t);
      controller.abort();
      cleanup?.();
    };
  }, deps ?? []);
};

/**
 * Combines useSignalEffect with useAsyncEffect.
 */
export const useAsyncSignalEffect = (
  cb: (controller: AbortController) => Promise<EffectCallback | void>,
  deps?: DependencyList,
): void => {
  useEffect(() => {
    const controller = new AbortController();
    let cleanup: EffectCallback | void;
    effect(() => {
      if (!controller.signal.aborted) {
        void cb(controller).then((c) => {
          cleanup = c;
        });
      }
    });

    return () => {
      controller.abort();
      cleanup?.();
    };
  }, deps ?? []);
};
