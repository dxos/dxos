//
// Copyright 2025 DXOS.org
//

import { type Runtime } from '@dxos/protocols/proto/dxos/config';

/**
 * pnpm -w nx dev ai-service --port 8788
 * pnpm -w nx dev edge --port 8787
 */
// TODO(burdon): Move to dxos/config.
// TODO(burdon): Reconcile all static defs.
export const SERVICES_CONFIG: Record<string, Runtime.Services> = {
  LOCAL: {
    ai: {
      server: 'http://localhost:8788',
    },
    edge: {
      url: 'http://localhost:8787',
    },
  },
  REMOTE: {
    ai: {
      server: 'https://ai-service.dxos.workers.dev',
    },
    edge: {
      url: 'https://edge-main.dxos.workers.dev',
    },
  },
};

// TODO(burdon): Move to config/yml.
export const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';
