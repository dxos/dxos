//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback } from 'react';

import { Config, PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Button } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/storybook-utils';

import { useClient } from '../client';
import { withClientProvider } from '../testing';

import { useCredentials } from './useCredentials';
import { useIdentity } from './useIdentity';

const getNewChallenge = () => Math.random().toString(36).substring(2);

const Test = () => {
  const client = useClient();
  const identity = useIdentity();
  const credentials = useCredentials();

  const handleCreateIdentity = useCallback(async () => {
    await client.halo.createIdentity();
    invariant(client.services.services.EdgeAgentService, 'Missing EdgeAgentService');
    await client.services.services.EdgeAgentService.createAgent(null as any, { timeout: 10_000 });
  }, [client]);

  // TODO(wittjosiah): Consider factoring out passkey creation to the halo api.
  const handleCreatePassKey = useCallback(async () => {
    invariant(identity, 'Identity not available');
    const challenge = getNewChallenge();
    const lookupKey = PublicKey.random();
    // https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions
    const credential = await navigator.credentials
      .create({
        publicKey: {
          challenge: new TextEncoder().encode(challenge),
          rp: { id: location.hostname, name: 'Test' },
          user: {
            id: lookupKey.asUint8Array() as Uint8Array<ArrayBuffer>,
            name: identity.did,
            displayName: identity.profile?.displayName ?? '',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -8 }, // Ed25519 (not yet supported across all browsers)
            { type: 'public-key', alg: -7 }, // ES256
          ],
          // https://web.dev/articles/webauthn-discoverable-credentials#resident-key
          authenticatorSelection: {
            residentKey: 'required',
            requireResidentKey: true,
          },
        },
      })
      .catch(log.error);

    invariant(credential, 'Credential not available');
    const recoveryKey = PublicKey.from(new Uint8Array((credential as any).response.getPublicKey()));
    const algorithm = (credential as any).response.getPublicKeyAlgorithm() === -7 ? 'ES256' : 'ED25519';

    invariant(client.services.services.IdentityService, 'IdentityService not available');
    // TODO(wittjosiah): This needs a proper api.
    await client.services.services.IdentityService.createRecoveryCredential({
      data: {
        recoveryKey,
        algorithm,
        lookupKey,
      },
    });
  }, [client, identity]);

  const handleAuthenticate = useCallback(async () => {
    invariant(client.services.services.IdentityService, 'IdentityService not available');
    const { deviceKey, controlFeedKey, challenge } =
      await client.services.services.IdentityService.requestRecoveryChallenge();
    const credential = await navigator.credentials
      .get({
        publicKey: {
          challenge: Buffer.from(challenge, 'base64'),
          rpId: location.hostname,
          // NOTE: Don't prompt for password in storybook for test purposes.
          //   In practice, this should be set to 'required' for identity recovery.
          userVerification: 'discouraged',
        },
      })
      .catch(log.error);
    const lookupKey = PublicKey.from(new Uint8Array((credential as any).response.userHandle));
    await client.services.services.IdentityService.recoverIdentity({
      external: {
        lookupKey,
        deviceKey,
        controlFeedKey,
        signature: Buffer.from((credential as any).response.signature),
        clientDataJson: Buffer.from((credential as any).response.clientDataJSON),
        authenticatorData: Buffer.from((credential as any).response.authenticatorData),
      },
    });
  }, []);

  return (
    <>
      <div className='mbe-4 flex gap-2'>
        <Button disabled={!!identity} onClick={handleCreateIdentity}>
          Create Identity
        </Button>
        <Button disabled={!identity} onClick={handleCreatePassKey}>
          Create Passkey
        </Button>
        <Button disabled={!!identity} onClick={handleAuthenticate}>
          Authenticate with Passkey
        </Button>
      </div>
      <div className='flex flex-col min-w-[28rem] divide-y divide-separator border border-separator rounded'>
        <SyntaxHighlighter language='json'>
          {JSON.stringify({ identity, credentials: credentials.length }, null, 2)}
        </SyntaxHighlighter>
      </div>
    </>
  );
};

const config = new Config({
  runtime: {
    client: {
      edgeFeatures: {
        agents: true,
        echoReplicator: true,
        feedReplicator: true,
        signaling: true,
      },
    },
    services: {
      edge: {
        url: 'wss://edge-main.dxos.workers.dev/',
        // url: 'ws://localhost:8787',
      },
      iceProviders: [{ urls: 'https://edge-production.dxos.workers.dev/ice' }],
    },
  },
});

const meta = {
  title: 'sdk/react-client/Passkeys',
  render: Test,
  decorators: [withClientProvider({ config }), withTheme],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
