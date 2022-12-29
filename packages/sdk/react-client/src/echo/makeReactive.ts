//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useReducer, useState } from 'react';
import { useClient } from '../client';

export const makeReactive =
  <P>(comp: React.FC<P>): React.FC<P> =>
  (props) => {
    const client = useClient();
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const [handle] = useState(() =>
      client.echo.dbRouter.createSubscription(() => {
        forceUpdate();
      })
    );
    const accessObserver = client.echo.dbRouter.createAccessObserver();

    useEffect(() => {
      if (!handle.subscribed) {
        console.error('bug: subscription lost'); // TODO(dmaretskyi): Fix this.
      }

      return () => handle.unsubscribe();
    }, []);

    try {
      return comp(props);
    } finally {
      handle.update([...accessObserver.accessed]);
    }
  };
