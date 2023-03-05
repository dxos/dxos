//
// Copyright 2023 DXOS.org
//

import { useCallback } from 'react';

import { schema as chessSchema } from '@dxos/chess-app';
import { Client, fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { schema as frameboxSchema } from '@dxos/framebox';
import { fromLocal } from '@dxos/halo-app';
import { schema } from '@dxos/kai-types';
import { Generator } from '@dxos/kai-types/testing';

export const useClientProvider = (dev: boolean) => {
  return useCallback(async () => {
    const config = new Config(await Dynamics(), await Envs(), Defaults());
    const client = new Client({
      config,
      services:
        config.get('runtime.app.env.DX_VAULT') === 'true'
          ? dev
            ? fromLocal()
            : fromIFrame(config, { shell: true })
          : fromHost(config)
    });

    await client.initialize();

    // Auto create if in demo mode.
    // TODO(burdon): Different modes (testing). ENV/Config?
    // TODO(burdon): Manifest file to expose windows API to auto open invitee window.
    // chrome.windows.create({ '/join', incognito: true });
    if (dev && !client.halo.identity) {
      // TODO(burdon): Causes race condition.
      await client.halo.createIdentity();
    }

    // TODO(burdon): Document.
    client.echo.addSchema(schema);
    client.echo.addSchema(chessSchema);
    client.echo.addSchema(frameboxSchema);

    if (dev && client.halo.identity && client.echo.getSpaces().length === 0) {
      const space = await client.echo.createSpace();

      // TODO(burdon): Create context.
      const generator = new Generator(space.db);
      await generator.generate();
    }

    return client;
  }, [dev]);
};
