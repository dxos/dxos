//
// Copyright 2022 DXOS.org
//

import { useEffect, useRef } from 'react';

import { Selection, SubscriptionHandle, createSubscription } from '../access-observer';

/**
 * Create reactive selection.
 * Calls the callback when the selection changes and during the first render.
 */
export const useSubscription = (cb: () => void, selection: Selection) => {
  // Make sure that the callback is always the one from the latest render.
  // Without this, we would always call the callback from the initial render,
  // which might contain stale data.
  const callbackRef = useRef(cb);
  callbackRef.current = cb;

  const subscriptionRef = useRef<SubscriptionHandle>();

  useEffect(() => {
    subscriptionRef.current = createSubscription(() => {
      callbackRef.current();
    });

    return () => subscriptionRef.current?.unsubscribe();
  }, []);

  subscriptionRef.current?.update(selection);
  return subscriptionRef.current;
};
