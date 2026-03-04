//
// Copyright 2022 DXOS.org
//

import { inspect } from 'util';

import { describe, test } from 'vitest';

import { randomBytes } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { buf, create } from '@dxos/protocols/buf';
import { AuthorizedDeviceSchema, ChainSchema, PresentationSchema, ServiceAccessSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { createCredential, toBufPublicKey } from '../credentials';

import { signPresentation } from './presentation';

describe('json encoding', () => {
  test.skip('service access exercise by a device', async () => {
    const keyring = new Keyring();
    const serviceProvider = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();

    const serviceAccessCredential = await createCredential({
      assertion: create(ServiceAccessSchema, {
        serverName: 'hub.dxos.network',
        serverKey: toBufPublicKey(serviceProvider),
        identityKey: toBufPublicKey(identity),
        capabilities: ['beta'],
      }),
      subject: identity,
      issuer: serviceProvider,
      signer: keyring,
    });

    const deviceAuthorization = await createCredential({
      assertion: create(AuthorizedDeviceSchema, {
        deviceKey: toBufPublicKey(device),
        identityKey: toBufPublicKey(identity),
      }),
      subject: device,
      issuer: identity,
      signer: keyring,
    });

    const presentation = await signPresentation({
      presentation: create(PresentationSchema, { credentials: [serviceAccessCredential] }),
      signer: keyring,
      signerKey: device,
      chain: create(ChainSchema, { credential: deviceAuthorization }),
      nonce: randomBytes(32),
    });

    console.log('original (buf object):', inspect(presentation, false, null, true));

    const json = buf.toJson(PresentationSchema, presentation);
    console.log('json (buf):', inspect(json, false, null, true));

    const obj = buf.fromJson(PresentationSchema, json);
    console.log('object (buf round-trip):', inspect(obj, false, null, true));
  });
});
