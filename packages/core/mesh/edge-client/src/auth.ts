import { Signer } from '@dxos/crypto';
import type { PublicKey } from '@dxos/keys';
import { signPresentation } from '@dxos/credentials';
import type { EdgeIdentity } from './edge-client';
import { Keyring } from '@dxos/keyring';

export const createDeviceEdgeIdentity = async (signer: Signer, key: PublicKey): Promise<EdgeIdentity> => {
  return {
    identityKey: key.toHex(),
    peerKey: key.toHex(),
    presentCredentials: async ({ challenge }) => {
      return signPresentation({
        presentation: {
          credentials: [],
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
