//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import SyntaxHighlight from 'ink-syntax-highlight';
import fetch from 'node-fetch';
import React, { useState } from 'react';

import { sleep } from '@dxos/async';
import { useAsyncEffect } from '@dxos/react-async';

// TODO(burdon): From config?
const KUBE_ENDPOINT = 'http://kube.local:9003/.well-known/services.json';

const useStatus = () => {
  const [status, setStatus] = useState<any>();

  useAsyncEffect(async (isMounted) => {
    try {
      const result = await fetch(KUBE_ENDPOINT);
      const status = await result.json();
      const { services = [] } = status;
      await sleep(3000);
      if (!isMounted()) {
        // TODO(burdon): Partern?
        return;
      }

      setStatus({
        endpoint: KUBE_ENDPOINT,
        services: services.map(({ name, status }: any) => ({
          name,
          status
        }))
      });
    } catch (err) {
      if (!isMounted()) {
        return;
      }

      setStatus({
        error: String(err)
      });
    }
  }, []);

  return status;
};

export const KubeStatus = () => {
  const status = useStatus();
  if (!status) {
    return null;
  }

  return (
    <Box flexDirection='column'>
      <SyntaxHighlight
        language='json'
        code={JSON.stringify(status, undefined, 2)}
      />
    </Box>
  );
};
