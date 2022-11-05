//
// Copyright 2022 DXOS.org
//

import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { PortMuxer } from '@dxos/rpc-tunnel';
import { WorkerRuntime } from '@dxos/vault';

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
  const muxer = new PortMuxer(event.ports[0]);

  await workerRuntime.createSession({
    appPort: muxer.createWorkerPort({ channel: 'dxos:app' }),
    systemPort: muxer.createWorkerPort({ channel: 'dxos:wrtc' })
  });
};
