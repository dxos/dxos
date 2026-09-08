//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createCredentialSignerWithKey, verifyCredential } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols/proto';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { Timeframe } from '@dxos/timeframe';

import { codec } from './codec';

// Feed blocks are the one on-disk format carrying a signed `Credential`, so moving the envelope to
// buf needs the signature to survive it -- and blocks written by protobuf.js to still read back.
const legacyCodec = schema.getCodecForType('dxos.echo.feed.FeedMessage');

const createSignedFeedMessage = async (): Promise<FeedMessage> => {
  const keyring = new Keyring();
  const identityKey = await keyring.createKey();
  const deviceKey = await keyring.createKey();
  const credential = await createCredentialSignerWithKey(keyring, identityKey).createCredential({
    subject: deviceKey,
    assertion: { '@type': 'dxos.halo.credentials.AuthorizedDevice', deviceKey, identityKey },
  });

  return {
    timeframe: new Timeframe([[PublicKey.random(), 3]]),
    payload: { credential: { credential } },
  };
};

describe('pipeline/codec', () => {
  test('a signed credential still verifies after a round-trip through the feed codec', async () => {
    const message = await createSignedFeedMessage();
    const decoded = codec.decode(codec.encode(message));

    const credential = decoded.payload?.credential?.credential;
    expect(credential).toBeDefined();
    expect((await verifyCredential(credential!)).kind).toEqual('pass');
  });

  test('a block protobuf.js wrote reads back through the buf codec, signature intact', async () => {
    const message = await createSignedFeedMessage();
    const decoded = codec.decode(legacyCodec.encode(message));

    expect(decoded.timeframe?.frames()).toHaveLength(1);
    const credential = decoded.payload?.credential?.credential;
    expect(credential).toBeDefined();
    expect((await verifyCredential(credential!)).kind).toEqual('pass');
  });

  test('and a block the buf codec writes reads back through protobuf.js', async () => {
    const message = await createSignedFeedMessage();
    const decoded: FeedMessage = legacyCodec.decode(codec.encode(message));

    const credential = decoded.payload?.credential?.credential;
    expect(credential).toBeDefined();
    expect((await verifyCredential(credential!)).kind).toEqual('pass');
  });
});
