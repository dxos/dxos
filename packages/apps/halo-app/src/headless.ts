//
// Copyright 2022 DXOS.org
//

import { RpcPort } from '@dxos/rpc';
import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

import { IFrameRuntime } from './worker/iframe-runtime';

const createRuntime = async (origin: string, wrtcPort: RpcPort) => {
  const iframeRuntime = new IFrameRuntime({
    systemPort: wrtcPort,
    appOrigin: origin
  });
  window.addEventListener('beforeunload', () => {
    iframeRuntime.close().catch((err) => console.error(err));
  });

  await iframeRuntime.open();
};

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker(new URL('./shared-worker', import.meta.url), { type: 'module' });
    const muxer = new PortMuxer(worker.port);

    const wrtcPort = muxer.createWorkerPort({ channel: 'dxos:wrtc' });
    const workerAppPort = muxer.createWorkerPort({ channel: 'dxos:app' });
    const windowAppPort = createIFramePort({
      channel: 'dxos:app',
      onOrigin: (origin) => {
        setTimeout(async () => {
          await createRuntime(origin, wrtcPort);
        });
      }
    });

    workerAppPort.subscribe((msg) => windowAppPort.send(msg));
    windowAppPort.subscribe((msg) => workerAppPort.send(msg));
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
