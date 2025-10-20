//
// Copyright 2024 DXOS.org
//

import { createCredential, signPresentation } from '@dxos/credentials';
import { type Signer } from '@dxos/crypto';
import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { type Chain, type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import type { EdgeIdentity } from './edge-identity';

/**
 * Edge identity backed by a device key without a credential chain.
 */
export const createDeviceEdgeIdentity = async (signer: Signer, key: PublicKey): Promise<EdgeIdentity> => {
  return {
    identityKey: key.toHex(),
    peerKey: key.toHex(),
    presentCredentials: async ({ challenge }) => {
      return signPresentation({
        presentation: {
          credentials: [
            // Verifier requires at least one credential in the presentation to establish the subject.
            await createCredential({
              assertion: {
                '@type': 'dxos.halo.credentials.Auth',
              },
              issuer: key,
              subject: key,
              signer,
            }),
          ],
        },
        signer,
        signerKey: key,
        nonce: challenge,
      });
    },
  };
};

/**
 * Edge identity backed by a chain of credentials.
 */
export const createChainEdgeIdentity = async (
  signer: Signer,
  identityKey: PublicKey,
  peerKey: PublicKey,
  chain: Chain | undefined,
  credentials: Credential[],
): Promise<EdgeIdentity> => {
  const credentialsToSign =
    credentials.length > 0
      ? credentials
      : [
          await createCredential({
            assertion: {
              '@type': 'dxos.halo.credentials.Auth',
            },
            issuer: identityKey,
            subject: identityKey,
            signer,
            chain,
            signingKey: peerKey,
          }),
        ];

  return {
    identityKey: identityKey.toHex(),
    peerKey: peerKey.toHex(),
    presentCredentials: async ({ challenge }) => {
      // TODO: make chain required after device invitation flow update release
      invariant(chain);
      return signPresentation({
        presentation: {
          credentials: credentialsToSign,
        },
        signer,
        nonce: challenge,
        signerKey: peerKey,
        chain,
      });
    },
  };
};

/**
 * Edge identity backed by a random ephemeral key without HALO.
 */
export const createEphemeralEdgeIdentity = async (): Promise<EdgeIdentity> => {
  const keyring = new Keyring();
  const key = await keyring.createKey();
  return createDeviceEdgeIdentity(keyring, key);
};

/**
 * Creates a HALO chain of credentials to act as an edge identity.
 */
export const createTestHaloEdgeIdentity = async (
  signer: Signer,
  identityKey: PublicKey,
  deviceKey: PublicKey,
): Promise<EdgeIdentity> => {
  const deviceAdmission = await createCredential({
    assertion: {
      '@type': 'dxos.halo.credentials.AuthorizedDevice',
      deviceKey,
      identityKey,
    },
    issuer: identityKey,
    subject: deviceKey,
    signer,
  });
  return createChainEdgeIdentity(signer, identityKey, deviceKey, { credential: deviceAdmission }, [
    await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.Auth',
      },
      issuer: identityKey,
      subject: identityKey,
      signer,
    }),
  ]);
};

export const createStubEdgeIdentity = (
  { identityKey, deviceKey } = { identityKey: PublicKey.random().toHex(), deviceKey: PublicKey.random().toHex() },
): EdgeIdentity => {
  return {
    identityKey,
    peerKey: deviceKey,
    presentCredentials: async () => {
      throw new Error('Stub identity does not support authentication.');
    },
  };
};
