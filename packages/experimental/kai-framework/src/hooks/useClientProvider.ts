//
// Copyright 2023 DXOS.org
//

import { useCallback } from 'react';

import { schema as chessSchema } from '@dxos/chess-app';
import { schema as sandboxSchema } from '@dxos/kai-sandbox';
import { schema } from '@dxos/kai-types';
import { Generator } from '@dxos/kai-types/testing';
import { Client, fromIFrame, fromHost, Config, Defaults, Dynamics, Envs, Local } from '@dxos/react-client';

export const configProvider = async () => new Config(await Dynamics(), await Envs(), Local(), Defaults());

export const useClientProvider = (dev: boolean) => {
  return useCallback(async () => {
    const config = await configProvider();
    const client = new Client({
      config,
      // TODO(burdon): Factor out (or look for) a parseBool that treats "0" as false also.
      services: config.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config),
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
    // TODO(burdon): Make modular (via registry).
    client.spaces.addSchema(schema);
    client.spaces.addSchema(chessSchema);
    client.spaces.addSchema(sandboxSchema);

    if (dev && client.halo.identity.get() && client.spaces.get().length === 0) {
      const space = await client.spaces.create();
      space.properties.name = 'My Space';

      // TODO(burdon): Create context.
      const generator = new Generator(space.db);
      await generator.generate();
    }

    return client;
  }, [dev]);
};
