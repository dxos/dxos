//
// Copyright 2026 DXOS.org
//

import { type EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';

import { useConfig } from './useConfig';

/**
 * Hook resolving an EDGE service endpoint from the client config; `undefined` when the service is
 * not configured. Requires ClientContext to be set via ClientProvider.
 */
export const useEdgeServiceEndpoint = (serviceName: EdgeServiceName): string | undefined =>
  getEdgeServiceEndpoint(useConfig(), serviceName);
