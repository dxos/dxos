//
// Copyright 2022 DXOS.org
//

import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';
import { IframeRuntime } from './worker/iframe-runtime';

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

    const wrtcPort = muxer.createWorkerPort({ channel: 'dxos:wrtc' });
    
    const iframeRuntime = new IframeRuntime({
      systemPort: wrtcPort
    });
    await iframeRuntime.open();
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
