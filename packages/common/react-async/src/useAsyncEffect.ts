//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';

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
 * @param callback Receives a getter function that determines if the componet is still mounted.
 * @param destructor Receives the value retuned from the callback.
 * @param deps
 */
// TODO(burdon): Creade useAsyncMemo?
// TODO(burdon): Replace setImmediate everywhere (approx 30 places).
export const useAsyncEffect = <T> (
  callback: (isMounted: () => boolean) => Promise<T> | undefined,
  destructor?: ((value?: T) => void) | any[],
  deps?: any[]
) => {
  const [effectDestructor, effectDeps] =
    typeof destructor === 'function' ? [destructor, deps] : [undefined, destructor];

  useEffect(() => {
    let mounted = true;
    let value: T | undefined;
    const asyncResult = callback(() => mounted);

    // TODO(burdon): Catch exception.
    void Promise.resolve(asyncResult).then(result => {
      value = result;
    });

    return () => {
      mounted = false;
      effectDestructor?.(value);
    };
  }, effectDeps);
};
