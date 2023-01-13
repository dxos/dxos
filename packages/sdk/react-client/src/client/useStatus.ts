//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

import { asyncTimeout } from '@dxos/async';
import { log } from '@dxos/log';

import { useClient } from './ClientContext';

export const useStatus = (polling = 1_000) => {
  const [status, setStatus] = useState<boolean>(true);
  const client = useClient();
  useEffect(() => {
    // TODO(burdon): Generally check mounted before update.
    const i = setInterval(async () => {
      try {
        // TODO(burdon): Logging doesn't show up for this class.
        await asyncTimeout(client.getStatus(), 500);
        setStatus(true);
      } catch (err) {
        log.error('heartbeat stalled');
        setStatus(false);
      }
    }, polling);

    return () => clearInterval(i);
  }, []);

  return status;
};
