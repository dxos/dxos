//
// Copyright 2023 DXOS.org
//

import { useCallback } from 'react';

import { Client, fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { fromLocal } from '@dxos/halo-app';

import { schema } from '../proto';

export const useClientProvider = (dev: boolean) => {
  return useCallback(async () => {
    const config = new Config(await Dynamics(), await Envs(), Defaults());
    const client = new Client({
      config,
      services:
        config.get('runtime.app.env.DX_VAULT') === 'true'
          ? dev
            ? fromLocal()
            : fromIFrame(config, true)
          : fromHost(config)
    });

    await client.initialize();

    // Auto create if in demo mode.
    // TODO(burdon): Different modes (testing). ENV/Config?
    // TODO(burdon): Manifest file to expose windows API to auto open invitee window.
    // chrome.windows.create({ '/join', incognito: true });
    if (dev && !client.halo.identity) {
      // TODO(burdon): Causes race condition.
      await client.halo.createProfile();
    }

    // TODO(burdon): Document.
    client.echo.dbRouter.setSchema(schema);

    return client;
  }, [dev]);
};
