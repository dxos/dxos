//
// Copyright 2024 DXOS.org
//

import { type RouterObject } from './router';
import { type SwarmObject } from './swarm';

/**
 * Secrets management.
 * https://developers.cloudflare.com/workers/configuration/secrets
 */
export type Env = {
  WORKER_ENV: 'production' | 'local';

  ROUTER: DurableObjectNamespace<RouterObject>;
  SWARM: DurableObjectNamespace<SwarmObject>;
};
