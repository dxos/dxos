//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { randomBytes } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { Chain, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { describe, test } from '@dxos/test';
import { createCredential } from '../credentials';
import { verifyPresentation } from './verifier';
import { signPresentation } from './presentation';

describe('presentation verifier', () => {
  describe('chain', () => {
    test('pass', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          signer: keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random()
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain
      });

      const presentation = await signPresentation({
        presentation: { credentials: [credential] },
        signer: keyring,
        signerKey: device,
        chain,
        nonce: randomBytes(32)
      });

      expect(await verifyPresentation(presentation)).to.deep.equal({ kind: 'pass' });
    });

    test('fail', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          signer: keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random()
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain
      });

      const presentation = await signPresentation({
        presentation: { credentials: [credential] },
        signer: keyring,
        signerKey: device,
        nonce: randomBytes(32)
      });

      expect(await verifyPresentation(presentation)).to.deep.contain({ kind: 'fail' });
    });
  });
});
