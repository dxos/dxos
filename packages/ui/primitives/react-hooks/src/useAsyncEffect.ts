//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

import { log } from '@dxos/log';

/**
 * Process async event with optional non-async destructor.
 * Inspired by: https://github.com/rauldeheer/use-async-effect/blob/master/index.js
 *
 * ```tsx
 * useAsyncEffect(async () => {
 *   await test();
 * }, []);
 * ```
 *
 * The callback may check of the component is still mounted before doing state updates.
 *
 * ```tsx
 * const [value, setValue] = useState<string>();
 * useAsyncEffect<string>(async (isMounted) => {
 *   const value = await test();
 *   if (!isMounted()) {
 *     setValue(value);
 *   }
 * }, () => console.log('Unmounted'), []);
 * ```
 *
 * @param callback Receives a getter function that determines if the component is still mounted.
 * @param destructor Receives the value returned from the callback.
 * @param deps
 *
 * NOTE: This effect does not cancel the async operation if the component is unmounted.
 *
 * @deprecated Use useTimeout.
 */
export const useAsyncEffect = <T>(
  callback: (isMounted: () => boolean) => Promise<T> | undefined,
  destructor?: ((value?: T) => void) | any[],
  deps?: any[],
) => {
  const [effectDestructor, effectDeps] =
    typeof destructor === 'function' ? [destructor, deps] : [undefined, destructor];

  useEffect(() => {
    let mounted = true;
    let value: T | undefined;
    const asyncResult = callback(() => mounted);
    void Promise.resolve(asyncResult)
      .then((result) => {
        value = result;
      })
      .catch(log.catch);

    return () => {
      mounted = false;
      effectDestructor?.(value);
    };
  }, effectDeps);
};
