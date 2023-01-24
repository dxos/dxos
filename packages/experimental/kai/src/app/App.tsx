//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { HashRouter } from 'react-router-dom';

import { Client, fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { AppState, AppStateProvider, BotsProvider, FramesProvider } from '../hooks';
import { Generator, schema } from '../proto';
import { frames } from './Frames';
import { Routes } from './Routes';

const clientProvider = async (demo: boolean) => {
  const config = new Config(await Dynamics(), Defaults());
  const client = new Client({
    config,
    services: process.env.DX_VAULT === 'true' ? fromIFrame(config) : fromHost(config)
  });

  client.echo.dbRouter.setSchema(schema);
  await client.initialize();

  // Auto create if in demo mode.
  // TODO(burdon): Different modes (testing). ENV/Config?
  // TODO(burdon): Manifest file to expose windows API to auto open invitee window.
  // chrome.windows.create({ '/join', incognito: true });
  if (demo && !client.halo.profile) {
    await client.halo.createProfile();
    const space = await client.echo.createSpace();

    // TODO(burdon): Create context.
    const generator = new Generator(space.experimental.db);
    await generator.generate();
  }

  return client;
};

/**
 * Main app container with routes.
 */
export const App: FC<{ initialState: AppState }> = ({ initialState = {} }) => {
  // TODO(burdon): Error boundary and indicator.
  return (
    <ClientProvider client={() => clientProvider(initialState.demo ?? false)}>
      <AppStateProvider value={initialState}>
        <BotsProvider>
          <FramesProvider frames={frames}>
            <HashRouter>
              <Routes />
            </HashRouter>
          </FramesProvider>
        </BotsProvider>
      </AppStateProvider>
    </ClientProvider>
  );
};
