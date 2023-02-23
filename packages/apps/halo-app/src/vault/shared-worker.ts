//
// Copyright 2022 DXOS.org
//

import { WorkerRuntime } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { log } from '@dxos/log';
import { PortMuxer } from '@dxos/rpc-tunnel';

// NOTE: Verbose logging enabled in the shared worker for the time being.
const LOG_FILTER = 'client:debug,info';

const workerRuntime = new WorkerRuntime(async () => {
  const config = new Config(await Dynamics(), await Envs(), Defaults());
  log.config({ filter: LOG_FILTER, prefix: config.get('runtime.client.log.prefix') });
  return config;
});

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
    systemPort: portMuxer.createWorkerPort({ channel: 'dxos:system' }),
    shellPort: portMuxer.createWorkerPort({ channel: 'dxos:shell' })
  });
};
