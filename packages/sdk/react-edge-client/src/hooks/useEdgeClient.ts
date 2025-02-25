//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { useConfig } from '@dxos/react-client';

/**
 * Client for edge services.
 */
// TODO(mykola): This should be done through client-service RPC.
export const useEdgeClient = () => {
  const config = useConfig();
  const edgeUrl = config.values.runtime?.services?.edge?.url;
  invariant(edgeUrl, 'EDGE services not configured.');
  return useMemo(() => new EdgeHttpClient(edgeUrl), [edgeUrl]);
};
