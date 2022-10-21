//
// Copyright 2022 DXOS.org
//

import { Config, Defaults, Dynamics } from '@dxos/config';
import { PortMuxer } from '@dxos/rpc-tunnel';

import { WorkerRuntime } from './worker/worker-runtime';

const workerRuntime = new WorkerRuntime(new Config(await Dynamics(), Defaults(), {
  runtime: {
    client: {
      // TODO(dmaretskyi): There's an issue with enums imported from protocols in vite.
      //  Should be fixed after https://github.com/dxos/dxos/pull/1647 lands.
      mode: 1 /* local */
    }
  }
}));

workerRuntime.start().catch(err => {
  console.error(err);
});

onconnect = async event => {
  const muxer = new PortMuxer(event.ports[0]);

  await workerRuntime.newSession({
    appPort: muxer.createWorkerPort({ channel: 'dxos:app' }),
    systemPort: muxer.createWorkerPort({ channel: 'dxos:wrtc' })
  });
};
