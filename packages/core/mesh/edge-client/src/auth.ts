import { Signer } from '@dxos/crypto';
import type { PublicKey } from '@dxos/keys';
import { createCredential, signPresentation } from '@dxos/credentials';
import type { EdgeIdentity } from './edge-client';
import { Keyring } from '@dxos/keyring';

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

export const createEphemeralEdgeIdentity = async (): Promise<EdgeIdentity> => {
  const keyring = new Keyring();
  const key = await keyring.createKey();
  return createDeviceEdgeIdentity(keyring, key);
};
