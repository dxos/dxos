//
// Copyright 2023 DXOS.org
//

import { Config, fromIFrame } from '@dxos/client';

export const fromLocal = (shell = true) =>
  fromIFrame(
    new Config({ runtime: { client: { remoteSource: '/node_modules/@dxos/halo-app/local-vault.html' } } }),
    shell
  );
