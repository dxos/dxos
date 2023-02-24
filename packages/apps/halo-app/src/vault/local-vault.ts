//
// Copyright 2023 DXOS.org
//

import { Config, fromIFrame, IFrameClientServicesProxyOptions } from '@dxos/client';

export const fromLocal = (options: Omit<Partial<IFrameClientServicesProxyOptions>, 'source'> = {}) =>
  fromIFrame(new Config({ runtime: { client: { remoteSource: '/node_modules/@dxos/halo-app/local-vault.html' } } }), {
    shell: true,
    ...options
  });
