//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import type { MulticastObservable } from '@dxos/async';

export const useObservable = <T = any>(observable: MulticastObservable<T>) => {
  const [latestEvent, setLatestEvent] = useState<T | { type: 'error'; error: any } | { type: 'complete' }>(
    observable.get()
  );

  useEffect(() => {
    const subscription = observable.subscribe(
      (event: T) => setLatestEvent(event),
      (errorValue) => setLatestEvent({ type: 'error', error: errorValue }),
      () => setLatestEvent({ type: 'complete' })
    );
    return () => subscription.unsubscribe();
  }, [observable]);

  return latestEvent;
};
