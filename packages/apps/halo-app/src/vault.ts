//
// Copyright 2022 DXOS.org
//

import { IFrameRuntime } from '@dxos/client';
import { PortMuxer } from '@dxos/rpc-tunnel';

if (typeof SharedWorker !== 'undefined') {
  const worker = new SharedWorker(new URL('./shared-worker', import.meta.url), { type: 'module', name: 'dxos' });
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
    iframeRuntime.close().catch((err) => console.error(err));
  });
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
