//
// Copyright 2022 DXOS.org
//

import { IFrameHostRuntime, IFrameProxyRuntime } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { log } from '@dxos/log';
import { initializeAppTelemetry } from '@dxos/react-appkit';
import { createIFramePort, PortMuxer } from '@dxos/rpc-tunnel';

import { mobileAndTabletCheck } from './util';

void initializeAppTelemetry('halo-vault', new Config(Defaults()));

log.config({
  filter: process.env.LOG_FILTER ?? 'warn,vault:debug',
  prefix: process.env.LOG_BROWSER_PREFIX
});

const main = () => {
  // TODO(wittjosiah): Remove mobile check once we can inspect shared workers in iOS Safari.
  if (mobileAndTabletCheck() || typeof SharedWorker === 'undefined') {
    console.log('Running DXOS vault in compatibility mode.');
    const iframeRuntime: IFrameHostRuntime = new IFrameHostRuntime({
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
      iframeRuntime.stop().catch((err: Error) => log.catch(err));
    });
  } else {
    // NOTE: Url must be within SharedWorker instantiation for bundling to work as expected.
    const worker = new SharedWorker(new URL('./shared-worker', import.meta.url), {
      type: 'module',
      name: 'dxos-vault'
    });
    const portMuxer = new PortMuxer(worker.port);

    const iframeRuntime: IFrameProxyRuntime = new IFrameProxyRuntime({
      // TODO(dmaretskyi): Extract channel names to config.ts.
      systemPort: portMuxer.createWorkerPort({ channel: 'dxos:system' }),
      workerAppPort: portMuxer.createWorkerPort({ channel: 'dxos:app' }),
      windowAppPort: createIFramePort({
        channel: 'dxos:app',
        onOrigin: (origin) => iframeRuntime.open(origin)
      })
    });

    window.addEventListener('beforeunload', () => {
      iframeRuntime.close().catch((err: Error) => log.catch(err));
    });
  }
};

main();
