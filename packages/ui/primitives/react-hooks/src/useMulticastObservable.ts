//
// Copyright 2023 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { type MulticastObservable } from '@dxos/async';

/**
 * Subscribe to a MulticastObservable and return the latest value.
 * @param observable the observable to subscribe to. Will resubscribe if the observable changes.
 */
// TODO(burdon): Move to react-hooks.
export const useMulticastObservable = <T>(observable: MulticastObservable<T>): T => {
  // Make sure useSyncExternalStore is stable in respect to the observable.
  const subscribeFn = useMemo(
    () => (listener: () => void) => {
      const subscription = observable.subscribe(listener);

      return () => subscription.unsubscribe();
    },
    [observable],
  );

  // useSyncExternalStore will resubscribe to the observable and update the value if the subscribeFn changes.
  return useSyncExternalStore(subscribeFn, () => observable.get());
};
