//
// Copyright 2022 DXOS.org
//

import { inspect } from 'util';

import { describe, test } from 'vitest';

import { randomBytes } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { buf } from '@dxos/protocols/buf';
import { PresentationSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { schema } from '@dxos/protocols/proto';

import { createCredential } from '../credentials';

import { signPresentation } from './presentation';

describe('json encoding', () => {
  test.skip('service access exercise by a device', async () => {
    const keyring = new Keyring();
    const serviceProvider = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();

    const serviceAccessCredential = await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.ServiceAccess',
        serverName: 'hub.dxos.network',
        serverKey: serviceProvider,
        identityKey: identity,
        capabilities: ['beta'],
      },
      subject: identity,
      issuer: serviceProvider,
      signer: keyring,
    });

    const deviceAuthorization = await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        deviceKey: device,
        identityKey: identity,
      },
      subject: device,
      issuer: identity,
      signer: keyring,
    });

    const presentation = await signPresentation({
      presentation: { credentials: [serviceAccessCredential] },
      signer: keyring,
      signerKey: device,
      chain: { credential: deviceAuthorization },
      nonce: randomBytes(32),
    });

    console.log('original (codec-protobuf object):', inspect(presentation, false, null, true));

    const json = schema.getCodecForType('dxos.halo.credentials.Presentation').encodeToJson(presentation);
    console.log('json (pb.js):', inspect(json, false, null, true));

    // TODO(dmaretskyi): Fails because protobuf.js encodes timestamp as object.
    const obj = buf.fromJson(PresentationSchema, json);
    console.log('object (buf):', inspect(obj, false, null, true));
  });
});
