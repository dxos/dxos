//
// Copyright 2022 DXOS.org
//

import { useEffect, useRef } from 'react';

import { Selection, SubscriptionHandle } from '@dxos/echo-schema';

import { useClient } from '../client';

/**
 * Create reactive selection.
 * Calls the callback when any object from the selection changes.
 * Also calls the callback when the selection changes and during the first render.
 */
export const useSubscription = (cb: () => void, selection: Selection) => {
  const client = useClient();

  // Make sure that the callback is always the one from the latest render.
  // Without this, we would always call the callback from the initial render,
  // which might contain stale data.
  const callbackRef = useRef(cb);
  callbackRef.current = cb;

  const subscriptionRef = useRef<SubscriptionHandle>();

  useEffect(() => {
    subscriptionRef.current = client.echo.dbRouter.createSubscription(() => {
      callbackRef.current();
    });

    return () => subscriptionRef.current?.unsubscribe();
  }, []);

  subscriptionRef.current?.update(selection);
  return subscriptionRef.current;
};
