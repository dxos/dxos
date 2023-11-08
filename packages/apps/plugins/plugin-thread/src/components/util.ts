//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { createSubscription } from '@dxos/react-client/echo';

// TODO(burdon): Factor out.
export const useSubscription = (data: any) => {
  const [_, setIter] = useState([]);
  useEffect(() => {
    const handle = createSubscription(() => setIter([]));
    handle.update(data);
    return () => handle.unsubscribe();
  }, []);
};
