//
// Copyright 2022 DXOS.org
//

import { useEffect, useReducer, useRef, useState } from 'react';

import { Selection, SubscriptionHandle } from '@dxos/echo-schema';

import { useClient } from '../client';

/**
 * Create reactive selection.
 * Calls the callback when any object from the selection changes.
 * Also calls the callback when the selection changes and during the first render.
 */
export const useSubscriptionEffect = (cb: () => void, selection: Selection) => {
  const client = useClient();

  // Make sure that the callback is always the one from the latest render.
  // Without this, we would always call the callback from the initial render,
  // which might contain stale data.
  const callbackRef = useRef(cb);
  callbackRef.current = cb;

  const [handle, setHandle] = useState<SubscriptionHandle>(() =>
    client.echo.dbRouter.createSubscription(() => {
      callbackRef.current();
    })
  );

  useEffect(() => {
    // TODO(dmaretskyi): Is this branch ever taken?
    if (!handle.subscribed) {
      const newHandle = client.echo.dbRouter.createSubscription(() => {
        callbackRef.current();
      });
      setHandle(newHandle);
      newHandle.update(selection);
    }

    return () => handle.unsubscribe();
  }, []);

  handle.update(selection);
  return handle;
};

/**
 * Create reactive selection.
 * Re-renders component when any object from the selection changes.
 */
export const useSubscription = (selection: Selection): SubscriptionHandle => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  return useSubscriptionEffect(() => {
    forceUpdate();
  }, selection);
};
