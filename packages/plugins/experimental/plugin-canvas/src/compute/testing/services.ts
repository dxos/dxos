//
// Copyright 2024 DXOS.org
//

import { AIServiceClientImpl } from '@dxos/assistant';
import { EdgeGpt } from '@dxos/conductor';
import { EdgeClient, EdgeHttpClient, createStubEdgeIdentity } from '@dxos/edge-client';

export type ServiceEndpoints = {
  edge: string;
  ai: string;
};

/**
 * pnpm -w nx dev edge --port 8787
 * pnpm -w nx dev ai-service --port 8788
 */
// eslint-disable-next-line unused-imports/no-unused-vars
const localServiceEndpoints = {
  edge: 'http://localhost:8787',
  ai: 'http://localhost:8788',
};

// eslint-disable-next-line unused-imports/no-unused-vars
const remoteServiceEndpoints = {
  edge: 'https://edge.dxos.workers.dev',
  ai: 'https://ai-service.dxos.workers.dev',
};

export const createEdgeServices = (services: ServiceEndpoints = localServiceEndpoints) => {
  return {
    gpt: new EdgeGpt(new AIServiceClientImpl({ endpoint: services.ai })),
    edgeClient: new EdgeClient(createStubEdgeIdentity(), { socketEndpoint: services.edge }),
    edgeHttpClient: new EdgeHttpClient(services.edge),
  };
};