//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { createEdgeIdentity } from '@dxos/client/edge';
import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { useClient, useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

/**
 * Client for edge services.
 */
// TODO(mykola): This should be done through client-service RPC.
export const useEdgeClient = () => {
  const config = useConfig();
  const client = useClient();
  const identity = useIdentity();
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'EDGE services not configured.');
  return useMemo(() => {
    const edgeClient = new EdgeHttpClient(edgeUrl);
    const edgeIdentity = createEdgeIdentity(client);
    edgeClient.setIdentity(edgeIdentity);
    return edgeClient;
  }, [edgeUrl, identity]);
};
