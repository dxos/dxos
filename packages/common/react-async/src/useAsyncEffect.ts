//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

/**
 * Process async event with optional non-async destructor.
 *
 * ```tsx
 * useAsyncEffect(async () => {
 *   await test();
 * });
 * ```
 *
 * @param callback
 * @param destructor
 * @param deps
 */
export const useAsyncEffect = (
  callback: () => Promise<void>,
  destructor?: () => void,
  deps: any[] = []
) => {
  useEffect(() => {
    // TODO(burdon): Catch exception.
    void Promise.resolve(callback);
    return destructor;
  }, deps);
};
