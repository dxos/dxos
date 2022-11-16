//
// Copyright 2022 DXOS.org
//

import { WorkerRuntime } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { PortMuxer } from '@dxos/rpc-tunnel';

log.config({ filter: 'info' });

const workerRuntime = new WorkerRuntime(async () => new Config(await Dynamics(), Defaults()));

const start = Date.now();
void workerRuntime.start().then(
  () => {
    log.info('worker ready', { initTimeMs: Date.now() - start });
  },
  (err) => {
    log.catch(err);
  }
);

onconnect = async (event) => {
  log.info('onconnect', { event });
  const portMuxer = new PortMuxer(event.ports[0]);
  await workerRuntime.createSession({
    appPort: portMuxer.createWorkerPort({ channel: 'dxos:app' }),
    systemPort: portMuxer.createWorkerPort({ channel: 'dxos:system' })
  });
};
