//
// Copyright 2024 DXOS.org
//

export type ServiceEndpoints = {
  ai: string;
  edge: string;
};

/**
 * pnpm -w nx dev ai-service --port 8788
 * pnpm -w nx dev edge --port 8787
 */
// TODO(burdon): Reconcile with ai/testing.
export const localServiceEndpoints = {
  ai: 'http://localhost:8788',
  edge: 'http://localhost:8787',
};

export const remoteServiceEndpoints = {
  ai: 'https://ai-service.dxos.workers.dev',
  edge: 'https://edge.dxos.workers.dev',
};
