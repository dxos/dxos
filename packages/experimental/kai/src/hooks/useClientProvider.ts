//
// Copyright 2023 DXOS.org
//

import { useCallback } from 'react';

import { schema as chessSchema } from '@dxos/chess-app';
import { Client, fromIFrame } from '@dxos/client';
import { fromHost } from '@dxos/client-services';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { schema as frameboxSchema } from '@dxos/framebox';
import { schema } from '@dxos/kai-types';
import { Generator } from '@dxos/kai-types/testing';

export const useClientProvider = (dev: boolean) => {
  return useCallback(async () => {
    const config = new Config(await Dynamics(), await Envs(), Defaults());
    const client = new Client({
      config,
      services:
        config.get('runtime.app.env.DX_VAULT') === 'true' ? fromIFrame(config, { shell: true }) : fromHost(config)
    });

    await client.initialize();

    // Auto create if in demo mode.
    // TODO(burdon): Different modes (testing). ENV/Config?
    // TODO(burdon): Manifest file to expose windows API to auto open invitee window.
    // chrome.windows.create({ '/join', incognito: true });
    if (dev && !client.halo.identity.get()) {
      // TODO(burdon): Causes race condition.
      await client.halo.createIdentity();
    }

    // TODO(burdon): Document.
    client.addSchema(schema);
    client.addSchema(chessSchema);
    client.addSchema(frameboxSchema);

    if (dev && client.halo.identity.get() && client.spaces.get().length === 0) {
      const space = await client.createSpace();
      space.properties.name = 'My Space';

      // TODO(burdon): Create context.
      const generator = new Generator(space.db);
      await generator.generate();
    }

    return client;
  }, [dev]);
};
