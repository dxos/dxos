//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React, { useMemo, useState } from 'react';

import { type Config, EDGE_URLS, SaveConfig, Storage } from '@dxos/config';
import { log } from '@dxos/log';
import { useClient, useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';

import { Select } from '../components/index.ts';
import { getTarget } from './VaultSelector.tsx';

/** Each EDGE environment with the account service (hub `authUrl`) its identities sign in through. */
const edgeServers = [
  { value: EDGE_URLS.local, label: 'Local', authUrl: 'https://account.dev.composer.space' },
  { value: EDGE_URLS.dev, label: 'Dev', authUrl: 'https://account.dev.composer.space' },
  { value: EDGE_URLS.preview, label: 'Preview', authUrl: 'https://account.preview.composer.space' },
  { value: EDGE_URLS.production, label: 'Production', authUrl: 'https://account.composer.space' },
];

/** Persists `value` as the EDGE environment; takes effect on the next load. */
const saveEdgeEnvironment = async (config: Config, value: string) => {
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
};

/**
 * Switches the EDGE environment. An identity belongs to the environment it was created in (its account,
 * agent and space replicas live there), so switching with one signs out first: the next load starts at the
 * login gate against the new environment instead of carrying the identity and its data across.
 */
export const EdgeSelector = () => {
  const config = useConfig();
  const client = useClient();
  const identity = useIdentity();
  const target = useMemo(() => getTarget(), [window.location.search]);
  const [pending, setPending] = useState<string>();
  const current = config.values.runtime?.services?.edge?.url;

  const switchEnvironment = async (value: string) => {
    try {
      // Sign out before saving: if deletion fails nothing has switched, and the identity is never left
      // pointed at an environment that has no account for it.
      if (identity) {
        await client.halo.deleteIdentity();
      }
      await saveEdgeEnvironment(config, value);
      window.location.reload();
    } catch (err) {
      log.catch(err);
    }
  };

  const handleValueChange = (value: string) => {
    if (value === current) {
      return;
    }
    if (identity) {
      setPending(value);
    } else {
      void switchEnvironment(value);
    }
  };

  const pendingLabel = edgeServers.find((server) => server.value === pending)?.label ?? pending;

  return (
    <>
      <Select
        disabled={target.value !== 'default'}
        value={current}
        items={edgeServers}
        onValueChange={handleValueChange}
      />
      <AlertDialog.Root
        open={pending !== undefined}
        onOpenChange={({ open }) => {
          if (!open) {
            setPending(undefined);
          }
        }}
      >
        <AlertDialog.Content>
          <AlertDialog.Body>
            <AlertDialog.Title>Switch to {pendingLabel}?</AlertDialog.Title>
            <AlertDialog.Description>
              Your identity belongs to the current environment. Switching signs you out and deletes this device&apos;s
              identity and spaces, then reloads at the login screen for {pendingLabel}.
            </AlertDialog.Description>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <div className='grow' />
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              variant='destructive'
              onClick={() => {
                if (pending) {
                  void switchEnvironment(pending);
                }
              }}
            >
              Sign out and switch
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  );
};
