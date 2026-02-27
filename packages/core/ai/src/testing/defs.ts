//
// Copyright 2025 DXOS.org
//

import { create } from '@dxos/protocols/buf';
import {
  type Runtime_Services,
  Runtime_ServicesSchema,
  Runtime_Services_AiSchema,
  Runtime_Services_EdgeSchema,
} from '@dxos/protocols/buf/dxos/config_pb';

/**
 * pnpm -w nx dev ai-service --port 8788
 * pnpm -w nx dev edge --port 8787
 */
// TODO(burdon): Move to dxos/config.
// TODO(burdon): Reconcile all static defs.
export const SERVICES_CONFIG: Record<string, Runtime_Services> = {
  LOCAL: create(Runtime_ServicesSchema, {
    ai: create(Runtime_Services_AiSchema, {
      server: 'http://localhost:8788',
    }),
    edge: create(Runtime_Services_EdgeSchema, {
      url: 'http://localhost:8787',
    }),
  }),
  REMOTE: create(Runtime_ServicesSchema, {
    ai: create(Runtime_Services_AiSchema, {
      server: 'https://ai-service.dxos.workers.dev',
    }),
    edge: create(Runtime_Services_EdgeSchema, {
      url: 'https://edge-main.dxos.workers.dev',
    }),
  }),
};

// TODO(burdon): Move to config/yml.
export const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';
