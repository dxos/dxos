//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { base, EchoObject } from '@dxos/echo-schema';

// TODO(burdon): Move to react-client.
export const useSubscription = (deps: EchoObject[]) => {
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const handles = deps.map((obj) =>
      obj[base].modified.on(() => {
        forceUpdate({});
      })
    );

    return () => {
      handles.map((handle) => handle());
    };
  }, [deps]);
};
