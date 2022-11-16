//
// Copyright 2022 DXOS.org
//

import { IFrameRuntime } from '@dxos/client';
import { log } from '@dxos/log';
import { PortMuxer } from '@dxos/rpc-tunnel';

if (typeof SharedWorker === 'undefined') {
  throw new Error('Browser does not support shared workers.');
}

const WORKER_MODULE = new URL('./shared-worker', import.meta.url);

const worker = new SharedWorker(WORKER_MODULE, { type: 'module', name: 'dxos-vault' });
const portMuxer = new PortMuxer(worker.port);

const iframeRuntime: IFrameRuntime = new IFrameRuntime({
  // TODO(dmaretskyi): Extract names to config.ts.
  systemPort: portMuxer.createWorkerPort({ channel: 'dxos:system' }),
  workerAppPort: portMuxer.createWorkerPort({ channel: 'dxos:app' }),
  windowAppPort: portMuxer.createIFramePort({
    channel: 'dxos:app',
    onOrigin: (origin) => iframeRuntime.open(origin)
  })
});

window.addEventListener('beforeunload', () => {
  iframeRuntime.close().catch((err) => log.catch(err));
});
