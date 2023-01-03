//
// Copyright 2023 DXOS.org
//

import { useEffect, useReducer } from 'react';

import { base, EchoObject } from '@dxos/echo-schema';

// TODO(burdon): Move to react-client.
export const useSubscription = (deps: EchoObject[]) => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const handles = deps.map((obj) =>
      obj[base].modified.on(() => {
        forceUpdate();
      })
    );

    return () => {
      handles.map((handle) => handle());
    };
  }, [deps]);
};
