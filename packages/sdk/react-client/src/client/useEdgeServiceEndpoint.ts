//
// Copyright 2026 DXOS.org
//

import { useContext } from 'react';

import { type EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';

import { ClientContext } from './context';

/**
 * Hook resolving an EDGE service endpoint from the client config; `undefined` when the service is
 * not configured.
 *
 * Returns `undefined` outside a `ClientProvider` rather than throwing: the callers are app-wide
 * drivers mounted by `Capabilities.ReactContext`, which render during startup and on any path where
 * the client never arrives — a throw there takes the whole app to the fatal dialog over an endpoint
 * the driver only needs once it has work to do.
 */
export const useEdgeServiceEndpoint = (serviceName: EdgeServiceName): string | undefined => {
  const context = useContext(ClientContext);
  return context ? getEdgeServiceEndpoint(context.client.config, serviceName) : undefined;
};
