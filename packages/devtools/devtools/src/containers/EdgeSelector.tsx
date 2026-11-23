//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React, { useMemo } from 'react';

import { EDGE_URLS, SaveConfig, Storage } from '@dxos/config';
import { useConfig } from '@dxos/react-client';

import { Select } from '../components/index.ts';
import { getTarget } from './VaultSelector.tsx';

/** Each EDGE environment with the account service (hub `authUrl`) its identities sign in through. */
const edgeServers = [
  { value: EDGE_URLS.local, label: 'Local', authUrl: 'https://account.dev.composer.space' },
  { value: EDGE_URLS.dev, label: 'Dev', authUrl: 'https://account.dev.composer.space' },
  { value: EDGE_URLS.preview, label: 'Preview', authUrl: 'https://account.preview.composer.space' },
  { value: EDGE_URLS.production, label: 'Production', authUrl: 'https://account.composer.space' },
];

export const EdgeSelector = () => {
  const config = useConfig();
  const target = useMemo(() => getTarget(), [window.location.search]);

  const handleSetSignalServer = async (value: string) => {
    const server = edgeServers.find((candidate) => candidate.value === value);
    const hubUrl = `${value}/hub/`;
    // Sign-up and passkey sign-in read `DX_HUB_URL` / `DX_AUTH_URL` before the service entries, so they move
    // too: left on the build's environment, an account lands in another environment's hub than the identity's
    // EDGE, which then refuses it. Only keys the app already sets, since `DX_HUB_URL` also turns sign-up on.
    const appEnv = config.values.runtime?.app?.env ?? {};
    const env = {
      ...('DX_HUB_URL' in appEnv ? { DX_HUB_URL: hubUrl } : {}),
      ...('DX_AUTH_URL' in appEnv && server ? { DX_AUTH_URL: server.authUrl } : {}),
    };
    const existing = await Storage();
    await SaveConfig(
      defaultsDeep(
        {
          runtime: {
            ...(Object.keys(env).length > 0 ? { app: { env } } : {}),
            services: {
              edge: { url: value },
              // EDGE checks accounts against the hub it serves under `/hub`, so the hub entry moves with it.
              hub: { url: hubUrl, ...(server ? { authUrl: server.authUrl } : {}) },
            },
          },
        },
        existing,
      ),
    );
    window.location.reload();
  };

  return (
    <Select
      disabled={target.value !== 'default'}
      value={config.values.runtime?.services?.edge?.url}
      items={edgeServers}
      onValueChange={(value) => handleSetSignalServer(value)}
    />
  );
};
