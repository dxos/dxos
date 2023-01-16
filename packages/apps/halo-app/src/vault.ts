//
// Copyright 2022 DXOS.org
//

import { IFrameCompatibilityRuntime, IFrameRuntime } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

import { mobileAndTabletCheck } from './util';

log.config({
  filter: process.env.LOG_FILTER ?? 'warn,localstorage:debug',
  prefix: process.env.LOG_BROWSER_PREFIX
});

// TODO(wittjosiah): Remove mobile check once we can inspect shared workers in iOS Safari.
if (mobileAndTabletCheck() || typeof SharedWorker === 'undefined') {
  console.log('Running DXOS vault in compatibility mode.');
  const iframeRuntime: IFrameCompatibilityRuntime = new IFrameCompatibilityRuntime({
    configProvider: async () => new Config(await Dynamics(), Defaults()),
    appPort: createIFramePort({
      channel: 'dxos:app',
      onOrigin: (origin) => {
        iframeRuntime.origin = origin;
      }
    })
  });

  void iframeRuntime.start();

  window.addEventListener('beforeunload', () => {
    iframeRuntime.stop().catch((err) => log.catch(err));
  });
} else {
  // NOTE: Url must be within SharedWorker instantiation for bundling to work as expected.
  const worker = new SharedWorker(new URL('./shared-worker', import.meta.url), { type: 'module', name: 'dxos-vault' });
  const portMuxer = new PortMuxer(worker.port);

  const iframeRuntime: IFrameRuntime = new IFrameRuntime({
    // TODO(dmaretskyi): Extract channel names to config.ts.
    systemPort: portMuxer.createWorkerPort({ channel: 'dxos:system' }),
    workerAppPort: portMuxer.createWorkerPort({ channel: 'dxos:app' }),
    windowAppPort: createIFramePort({
      channel: 'dxos:app',
      onOrigin: (origin) => iframeRuntime.open(origin)
    })
  });

  window.addEventListener('beforeunload', () => {
    iframeRuntime.close().catch((err) => log.catch(err));
  });
}
