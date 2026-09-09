//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { createCredentialSignerWithKey, verifyCredential } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey, fromTimeframe } from '@dxos/protocols/buf';
import {
  CredentialsMessageSchema,
  type FeedMessage,
  FeedMessageSchema,
  FeedMessage_PayloadSchema,
} from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { AuthorizedDeviceSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Timeframe } from '@dxos/timeframe';

import { codec } from './codec';

// Feed blocks are the one on-disk format carrying a signed `Credential`, so the envelope's codec has
// to leave the signature intact.
describe('pipeline/codec', () => {
  test('a signed credential still verifies after a round-trip through the feed codec', async () => {
    const message = await createSignedFeedMessage();
    const decoded = codec.decode(codec.encode(message));

    const credential = decoded.payload?.payload.value?.credential;
    expect(credential).toBeDefined();
    expect((await verifyCredential(credential!)).kind).toEqual('pass');
  });

  test('the timeframe survives the round-trip', async () => {
    const message = await createSignedFeedMessage();
    const decoded = codec.decode(codec.encode(message));

    expect(decoded.timeframe).to.deep.equal(message.timeframe);
  });
});

const createSignedFeedMessage = async (): Promise<FeedMessage> => {
  const keyring = new Keyring();
  const identityKey = await keyring.createKey();
  const deviceKey = await keyring.createKey();
  const credential = await createCredentialSignerWithKey(keyring, identityKey).createCredential({
    subject: deviceKey,
    assertion: create(AuthorizedDeviceSchema, {
      deviceKey: fromPublicKey(deviceKey),
      identityKey: fromPublicKey(identityKey),
    }),
  });

  return create(FeedMessageSchema, {
    timeframe: fromTimeframe(new Timeframe([[PublicKey.random(), 3]])),
    payload: create(FeedMessage_PayloadSchema, {
      payload: { case: 'credential', value: create(CredentialsMessageSchema, { credential }) },
    }),
  });
};
