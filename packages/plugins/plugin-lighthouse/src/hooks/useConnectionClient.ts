//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { useObject } from '@dxos/echo-react';
import { type Connection } from '@dxos/link';

import { type LighthouseClient } from '#client';
import { LighthouseCapabilities } from '#types';

import { getEndpoint } from '../util/endpoint.ts';

/**
 * The client for a lighthouse connection, from the registered factory that handles its URL; undefined while its
 * credential loads.
 */
export const useConnectionClient = (connection: Connection.Connection | undefined): LighthouseClient | undefined => {
  const [snapshot] = useObject(connection);
  const [accessToken] = useObject(snapshot?.accessToken);
  const factories = Hooks.useCapabilities(LighthouseCapabilities.ClientFactory);
  const url = accessToken ? getEndpoint(accessToken).url : undefined;
  const token = accessToken?.token;
  return useMemo(() => {
    if (url === undefined) {
      return undefined;
    }
    return factories.find((factory) => factory.match(url))?.make({ url, token });
  }, [factories, url, token]);
};
