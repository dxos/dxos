import { Signer } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createCredential, signPresentation } from '@dxos/credentials';
import type { EdgeIdentity } from './edge-client';
import { Keyring } from '@dxos/keyring';

/**
 * Edge identity backed by a device key without HALO.
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
  return {
    identityKey: identityKey.toHex(),
    peerKey: deviceKey.toHex(),
    presentCredentials: async ({ challenge }) => {
      return signPresentation({
        presentation: {
          credentials: [
            // Verifier requires at least one credential in the presentation to establish the subject.
            await createCredential({
              assertion: {
                '@type': 'dxos.halo.credentials.Auth',
              },
              issuer: identityKey,
              subject: identityKey,
              signer,
              signingKey: deviceKey,
              chain: { credential: deviceAdmission },
            }),
          ],
        },
        signer,
        nonce: challenge,
        signerKey: deviceKey,
        chain: { credential: deviceAdmission },
      });
    },
  };
};

export const createStubEdgeIdentity = (): EdgeIdentity => {
  const identityKey = PublicKey.random();
  const deviceKey = PublicKey.random();
  return {
    identityKey: identityKey.toHex(),
    peerKey: deviceKey.toHex(),
    presentCredentials: async () => {
      throw new Error('Stub identity does not support authentication.');
    },
  };
};
