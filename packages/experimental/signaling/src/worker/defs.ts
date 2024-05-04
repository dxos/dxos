//
// Copyright 2024 DXOS.org
//

import { type SocketObject } from './socket';
import { type SwarmObject } from './swarm';

/**
 * Secrets management.
 * https://developers.cloudflare.com/workers/configuration/secrets
 */
export type Env = {
  WORKER_ENV: 'production' | 'local';

  SOCKET: DurableObjectNamespace<SocketObject>;
  SWARM: DurableObjectNamespace<SwarmObject>;
};
