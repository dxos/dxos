//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { HashRouter } from 'react-router-dom';

import { Client, fromHost, fromIFrame } from '@dxos/client';
import { Config, Defaults } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { AppView, OptionsContext } from '../hooks';
import { schema } from '../proto';
import { Routes } from './Routes';

const clientProvider = async () => {
  const config = new Config(Defaults());
  const client = new Client({
    config,
    services: process.env.DX_VAULT === 'true' ? fromIFrame(config) : fromHost(config)
  });

  client.echo.dbRouter.setSchema(schema);
  await client.initialize();
  return client;
};

/**
 * Main app container with routes.
 */
export const App: FC<{ views: AppView[]; debug?: boolean; demo?: boolean }> = ({
  views,
  debug = false,
  demo = true
}) => {
  // TODO(burdon): Error boundary and indicator.
  return (
    <ClientProvider client={clientProvider}>
      <OptionsContext.Provider value={{ debug, demo, views }}>
        <HashRouter>
          <Routes />
        </HashRouter>
      </OptionsContext.Provider>
    </ClientProvider>
  );
};
