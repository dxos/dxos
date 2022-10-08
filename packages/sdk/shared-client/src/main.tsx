//
// Copyright 2022 DXOS.org
//

import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

// eslint-disable-next-line
// @ts-ignore
import SharedWorker from './shared-worker?sharedworker';

if (typeof SharedWorker !== 'undefined') {
  void (async () => {
    const worker = new SharedWorker();
    const muxer = new PortMuxer(worker.port);

    const clientPort = muxer.createWorkerPort({ channel: 'dxos' });
    const appPort = createIFramePort({ channel: 'dxos' });

    clientPort.subscribe(msg => appPort.send(msg));
    appPort.subscribe(msg => clientPort.send(msg));
  })();
} else {
  throw new Error('Requires a browser with support for shared workers.');
}
