//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useReducer, useState } from 'react';

import { useSpace } from './context';

export const makeReactive =
  <P>(comp: React.FC<P>): React.FC<P> =>
  (props) => {
    const { database: db } = useSpace();
    const [, forceUpdate] = useReducer((x) => x + 1, 0);
    const [handle] = useState(() =>
      db.createSubscription(() => {
        forceUpdate();
      })
    );
    const accessObserver = db.createAccessObserver();

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
