import { Selection, SubscriptionHandle } from "@dxos/echo-schema";
import { useEffect, useState } from "react";
import { useClient } from "../client";

/**
 * Create reactive selection.
 */
export const useSubscription = (selection: Selection): SubscriptionHandle => {
  const client = useClient();
  const [, forceUpdate] = useState({});

  const [handle, setHandle] = useState<SubscriptionHandle>(() =>
    client.echo.dbRouter.createSubscription(() => {
      forceUpdate({});
    })
  );

  useEffect(() => {
    if (!handle.subscribed) {
      setHandle(
        client.echo.dbRouter.createSubscription(() => {
          forceUpdate({});
        })
      );

      handle.update(selection);
    }

    return () => handle.unsubscribe();
  }, []);

  handle.update(selection);
  return handle;
};
