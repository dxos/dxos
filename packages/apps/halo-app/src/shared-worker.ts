//
// Copyright 2022 DXOS.org
//

import { Config, Defaults, Dynamics } from '@dxos/config';
import { PortMuxer } from '@dxos/rpc-tunnel';

import { WorkerRuntime } from './worker/worker-runtime';

const workerRuntime = new WorkerRuntime(async () => new Config(await Dynamics(), Defaults()));

void workerRuntime.start().catch((err) => {
  console.error(err);
});

onconnect = async (event) => {
  const muxer = new PortMuxer(event.ports[0]);

  await workerRuntime.createSession({
    appPort: muxer.createWorkerPort({ channel: 'dxos:app' }),
    systemPort: muxer.createWorkerPort({ channel: 'dxos:wrtc' })
  });
};
