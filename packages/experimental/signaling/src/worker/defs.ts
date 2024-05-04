//
// Copyright 2024 DXOS.org
//

import { type SwarmObject } from './swarm';
import { type UserObject } from './user';

/**
 * Secrets management.
 * https://developers.cloudflare.com/workers/configuration/secrets
 */
export type Env = {
  WORKER_ENV: 'production' | 'local';

  USER: DurableObjectNamespace<UserObject>;
  SWARM: DurableObjectNamespace<SwarmObject>;
};
