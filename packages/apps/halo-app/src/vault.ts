//
// Copyright 2022 DXOS.org
//

import { IFrameRuntime } from '@dxos/client';
import { PortMuxer } from '@dxos/rpc-tunnel';

if (typeof SharedWorker !== 'undefined') {
  const worker = new SharedWorker(new URL('./shared-worker', import.meta.url), { type: 'module' });
  const iframeRuntime = new IFrameRuntime({ portMuxer: new PortMuxer(worker.port) });
  iframeRuntime.start();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
