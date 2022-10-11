//
// Copyright 2022 DXOS.org
//

import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker(new URL('./shared-worker', import.meta.url), { type: 'module' });
    const muxer = new PortMuxer(worker.port);

    const clientPort = muxer.createWorkerPort({ channel: 'dxos' });
    const appPort = createIFramePort({ channel: 'dxos' });

    clientPort.subscribe(msg => appPort.send(msg));
    appPort.subscribe(msg => clientPort.send(msg));
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
