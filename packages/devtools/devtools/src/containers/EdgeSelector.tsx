//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React, { useMemo, useState } from 'react';

import { type Config, EDGE_URLS, SaveConfig, Storage } from '@dxos/config';
import { log } from '@dxos/log';
import { useClient, useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import * as Dialog from '@dxos/react-ui/Dialog';
import { ConfirmReset } from '@dxos/shell/react';

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
  // Once deletion starts it runs to the reload, so the dialog cannot be cancelled or dismissed mid-way.
  const [switching, setSwitching] = useState(false);
  const current = config.values.runtime?.services?.edge?.url;

  const switchEnvironment = async (value: string) => {
    // Sign out before saving: if deletion fails nothing has switched, and the identity is never left
    // pointed at an environment that has no account for it.
    if (identity) {
      await client.halo.deleteIdentity();
    }
    await saveEdgeEnvironment(config, value);
    // `SaveConfig` logs a failed write and resolves, so read it back: a reload after a lost write would land on the
    // old environment as if the switch had worked.
    const saved = await Storage();
    if (saved?.runtime?.services?.edge?.url !== value) {
      throw new Error(`Could not save the ${value} environment; you are signed out on the current one.`);
    }
    window.location.reload();
  };

  const handleValueChange = (value: string) => {
    if (value === current) {
      return;
    }
    if (identity) {
      setPending(value);
    } else {
      void switchEnvironment(value).catch((err) => log.catch(err));
    }
  };

  const pendingLabel = edgeServers.find((server) => server.value === pending)?.label ?? pending;

  // The same confirmation as Composer's log out (plugin-client `ResetDialog`), since switching is one.
  return (
    <>
      <Select
        disabled={target.value !== 'default'}
        value={current}
        items={edgeServers}
        onValueChange={handleValueChange}
      />
      <Dialog.Root
        open={pending !== undefined}
        onOpenChange={({ open }) => {
          if (!open && !switching) {
            setPending(undefined);
          }
        }}
      >
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Switch to {pendingLabel}</Dialog.Title>
          </Dialog.Header>
          <Dialog.Description srOnly>Sign out and switch the EDGE environment.</Dialog.Description>
          <ConfirmReset
            active={!switching}
            message={`Your identity belongs to the current environment. Switching signs you out and deletes this device's identity and spaces, then reloads at the login screen for ${pendingLabel}.`}
            confirmLabel='Sign out and switch'
            onConfirm={async () => {
              if (!pending) {
                return;
              }
              setSwitching(true);
              try {
                await switchEnvironment(pending);
              } catch (err) {
                // ConfirmReset shows the failure; cancelling is allowed again.
                setSwitching(false);
                throw err;
              }
            }}
            onCancel={() => setPending(undefined)}
          />
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};
