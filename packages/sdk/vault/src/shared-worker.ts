//
// Copyright 2022 DXOS.org
//

import { WorkerRuntime } from '@dxos/client-services';
import { Config, Defaults, Dynamics, Envs, Local } from '@dxos/config';
import { log } from '@dxos/log';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { namespace } from './util';

const LOG_FILTER = 'warn';

void initializeAppTelemetry({
  namespace,
  config: new Config(Defaults()),
  sentryOptions: { tracing: false, replay: false },
  telemetryOptions: { enable: false },
});

const workerRuntime = new WorkerRuntime(async () => {
  const config = new Config(await Dynamics(), await Envs(), Local(), Defaults());
  log.config({ filter: LOG_FILTER, prefix: config.get('runtime.client.log.prefix') });
  return config;
});

// Allow to access host from console.
(globalThis as any).__DXOS__ = {
  host: workerRuntime.host,
};

const start = Date.now();
void workerRuntime.start().then(
  () => {
    log.info('worker ready', { initTimeMs: Date.now() - start });
  },
  (err) => {
    log.catch(err);
  },
);

onconnect = async (event) => {
  log.info('onconnect', { event });
  const port = event.ports[0];

  const systemChannel = new MessageChannel();
  const shellChannel = new MessageChannel();
  const appChannel = new MessageChannel();

  // NOTE: This is intentiontally not using protobuf because it occurs before the rpc connection is established.
  port.postMessage(
    {
      command: 'init',
      payload: {
        systemPort: systemChannel.port1,
        shellPort: shellChannel.port1,
        appPort: appChannel.port1,
      },
    },
    [systemChannel.port1, shellChannel.port1, appChannel.port1],
  );

  await workerRuntime.createSession({
    systemPort: createWorkerPort({ port: systemChannel.port2 }),
    shellPort: createWorkerPort({ port: shellChannel.port2 }),
    appPort: createWorkerPort({ port: appChannel.port2 }),
  });
};
