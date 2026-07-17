//
// Copyright 2026 DXOS.org
//

import { type ClientServicesProvider } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';

import { createClientServices } from '../services';

export type PersistentClientServices = {
  config: Config;
  services: Promise<ClientServicesProvider>;
};

/**
 * DEDICATED_WORKER mode + persistent OPFS storage, for stories/tests that need identity/spaces to
 * survive a page reload. A bare `createOpfsWorker` (HOST mode) spins up one independent OPFS
 * worker per browser tab with no cross-tab coordination — since OPFS access handles are exclusive
 * per file across the whole origin, a second tab locks out (see the failure-mode comment on
 * `OpfsWorker.run` in `@dxos/sql-sqlite`). This preset elects a single leader via `navigator.locks`
 * (through a coordinator `SharedWorker`) so follower tabs proxy through the leader instead.
 *
 * @param base Additional config deep-merged UNDER the persistent/DEDICATED_WORKER settings (which
 * always win on conflicting keys) — e.g. a caller-supplied `runtime.services` block.
 */
export const persistentClientServices = (base?: Config): PersistentClientServices => {
  const config = new Config(
    {
      runtime: {
        client: {
          servicesMode: Runtime.Client.ServicesMode.DEDICATED_WORKER,
          storage: { persistent: true },
        },
      },
    },
    ...(base ? [base.values] : []),
  );

  return {
    config,
    services: createClientServices(config, {
      createDedicatedWorker: () =>
        new Worker(new URL('@dxos/client/dedicated-worker', import.meta.url), { type: 'module' }),
      createCoordinatorWorker: () =>
        new SharedWorker(new URL('@dxos/client/coordinator-worker', import.meta.url), { type: 'module' }),
    }),
  };
};
