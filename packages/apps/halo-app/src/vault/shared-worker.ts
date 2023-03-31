//
// Copyright 2022 DXOS.org
//

import { WorkerRuntime } from '@dxos/client-services';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { log } from '@dxos/log';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { PortMuxer } from '@dxos/rpc-tunnel';

import { namespace } from '../util';

// NOTE: Verbose logging enabled in the shared worker for the time being.
const LOG_FILTER = 'client:debug,info';
console.log(Defaults());
void initializeAppTelemetry({
  namespace,
  config: new Config(Defaults()),
  sentryOptions: { tracing: false, replay: false },
  telemetryOptions: { enable: false }
});

const workerRuntime = new WorkerRuntime(async () => {
  const config = new Config(await Dynamics(), await Envs(), Defaults());
  log.config({ filter: LOG_FILTER, prefix: config.get('runtime.client.log.prefix') });
  return config;
});

// Allow to access host from console.
(globalThis as any).__DXOS__ = {
  host: workerRuntime.host
};

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
