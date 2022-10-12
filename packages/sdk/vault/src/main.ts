//
// Copyright 2022 DXOS.org
//

import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker(
      new URL('./shared-worker', import.meta.url),
      { type: 'module' }
    );
    const muxer = new PortMuxer(worker.port);

    const workerAppPort = muxer.createWorkerPort({ channel: 'dxos:app' });
    const windowAppPort = createIFramePort({ channel: 'dxos:app' });

    workerAppPort.subscribe(msg => windowAppPort.send(msg));
    windowAppPort.subscribe(msg => workerAppPort.send(msg));
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
