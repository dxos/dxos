//
// Copyright 2023 DXOS.org
//

import { ZenObservable } from '@dxos/async';

/**
 * Resolves the first value emitted by an observable.
 */
// TODO(wittjosiah): Factor out. Make method on Observable?
export const first = <T>(observable: ZenObservable<T>) => {
  return new Promise<T>((resolve) => {
    observable.subscribe((value) => {
      resolve(value);
    });
  });
};
