//
// Copyright 2025 DXOS.org
//

import { type MessageInitShape } from '@bufbuild/protobuf';

import { type Runtime_ServicesSchema } from '@dxos/protocols/buf/dxos/config_pb';

/**
 * pnpm -w nx dev ai-service --port 8788
 * pnpm -w nx dev edge --port 8787
 */
// TODO(burdon): Move to dxos/config.
// TODO(burdon): Reconcile all static defs.
export const SERVICES_CONFIG: Record<string, MessageInitShape<typeof Runtime_ServicesSchema>> = {
  LOCAL: {
    ai: {
      server: 'http://localhost:8788',
    },
    edge: {
      url: 'http://localhost:8787',
    },
  },
  REMOTE: {
    // ai-service is reached through the single edge entrypoint under the `/ai` prefix; its own
    // hostname is an implementation detail of not having a domain.
    ai: {
      server: 'https://preview.dxos.network/ai',
    },
    edge: {
      url: 'https://preview.dxos.network',
    },
  },
};

// TODO(burdon): Move to config/yml.
export const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';
