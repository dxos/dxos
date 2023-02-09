//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { generatePath, Outlet, useNavigate, useParams } from 'react-router-dom';

import { fromHost, fromIFrame, PublicKey } from '@dxos/client';
import { Config, Defaults, Dynamics, Envs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

import { Layout } from './Layout';

const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());
const servicesProvider = (config?: Config) =>
  config?.get('runtime.app.env.DX_VAULT') === 'false' ? fromHost(config) : fromIFrame(config);

export const Root = () => {
  const navigate = useNavigate();
  const { spaceKey } = useParams();

  return (
    <ClientProvider
      config={configProvider}
      services={servicesProvider}
      spaceProvider={{
        initialSpaceKey: PublicKey.safeFrom(spaceKey),
        onSpaceChange: (spaceKey) => {
          console.log({ spaceKey });
          if (!spaceKey) {
            return;
          }
          navigate(generatePath('/:spaceKey', { spaceKey: spaceKey.toHex() }));
        }
      }}
    >
      <Layout>
        <Outlet />
      </Layout>
    </ClientProvider>
  );
};
