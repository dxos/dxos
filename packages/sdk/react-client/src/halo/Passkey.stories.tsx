//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import React, { useCallback } from 'react';

import { Config, PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { Button } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/storybook-utils';

import { useCredentials } from './useCredentials';
import { useIdentity } from './useIdentity';
import { useClient } from '../client';
import { withClientProvider } from '../testing';

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
    // https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: new TextEncoder().encode(challenge),
        rp: { id: 'localhost', name: 'Test' },
        user: {
          id: new TextEncoder().encode(identity.did),
          name: identity.did,
          displayName: identity.profile?.displayName ?? '',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -8 }, // Ed25519 (not yet supported across all browsers)
          { type: 'public-key', alg: -7 }, // ES256
        ],
      },
    });

    invariant(credential, 'Credential not available');
    const recoveryKey = PublicKey.from(new Uint8Array((credential as any).response.getPublicKey()));
    const algorithm: number = (credential as any).response.getPublicKeyAlgorithm();

    invariant(client.services.services.IdentityService, 'IdentityService not available');
    // TODO(wittjosiah): This needs a proper api.
    await client.services.services.IdentityService.createRecoveryCredential({
      recoveryKey,
      algorithm,
    });
  }, [client, identity]);

  const handleAuthenticate = useCallback(async () => {
    invariant(client.services.services.IdentityService, 'IdentityService not available');
    const { deviceKey, controlFeedKey, challenge } =
      await client.services.services.IdentityService.requestRecoveryChallenge();
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: new TextEncoder().encode(challenge),
        rpId: 'localhost',
        // NOTE: Don't prompt for password in storybook for test purposes.
        //   In practice, this should be set to 'required' for identity recovery.
        userVerification: 'discouraged',
      },
    });
    const identityDid = new TextDecoder().decode((credential as any).response.userHandle);
    await client.services.services.IdentityService.recoverIdentity({
      external: {
        identityDid,
        deviceKey,
        controlFeedKey,
        signature: Buffer.from((credential as any).response.signature).toString('base64'),
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

export default {
  title: 'sdk/react-client/Passkeys',
  render: Test,
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
        // url: 'wss://edge.dxos.workers.dev/',
        url: 'ws://localhost:8787',
      },
      iceProviders: [{ urls: 'https://edge-production.dxos.workers.dev/ice' }],
    },
  },
});

export const Default = {
  decorators: [withClientProvider({ config }), withTheme],
};
