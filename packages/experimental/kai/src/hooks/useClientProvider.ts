//
// Copyright 2023 DXOS.org
//

import { Client, fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';

import { Generator, schema } from '../proto';

export const useClientProvider = () => {
  return async (dev: boolean) => {
    const config = new Config(await Dynamics(), await Envs(), Defaults());
    const client = new Client({
      config,
      services: config.get('runtime.app.env.DX_VAULT') === 'true' ? fromIFrame(config) : fromHost(config)
    });

    await client.initialize();

    // Auto create if in demo mode.
    // TODO(burdon): Different modes (testing). ENV/Config?
    // TODO(burdon): Manifest file to expose windows API to auto open invitee window.
    // chrome.windows.create({ '/join', incognito: true });
    if (dev && !client.halo.profile) {
      await client.halo.createProfile();
    }

    // TODO(burdon): Document.
    client.echo.dbRouter.setSchema(schema);
    if (dev && !client.halo.profile) {
      const space = await client.echo.createSpace();

      // TODO(burdon): Create context.
      const generator = new Generator(space.experimental.db);
      await generator.generate();
    }

    return client;
  };
};
