//
// Copyright 2024 DXOS.org
//

import { EdgeAiServiceClient } from '@dxos/ai';
import { EdgeClient, EdgeHttpClient, createStubEdgeIdentity } from '@dxos/edge-client';

export type ServiceEndpoints = {
  edge: string;
  ai: string;
};

/**
 * pnpm -w nx dev edge --port 8787
 * pnpm -w nx dev ai-service --port 8788
 */
// TODO(burdon): Reconcile with ai/testing.
export const localServiceEndpoints = {
  edge: 'http://localhost:8787',
  ai: 'http://localhost:8788',
};

export const remoteServiceEndpoints = {
  edge: 'https://edge.dxos.workers.dev',
  ai: 'https://ai-service.dxos.workers.dev',
};

export const createEdgeServices = (services: ServiceEndpoints = localServiceEndpoints) => {
  return {
    gpt: new EdgeAiServiceClient({ endpoint: services.ai }),
    edgeClient: new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: services.edge }),
    edgeHttpClient: new EdgeHttpClient(services.edge),
  };
};
