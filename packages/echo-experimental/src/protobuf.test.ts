//
// Copyright 2020 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';
import { FeedDescriptor } from '@dxos/feed-store';

import TestingSchema from './proto/gen/testing.json';

import { FeedKey } from './database';
import { createAdmit } from './testing';

const codec = new Codec('dxos.echo.testing.Envelope')
  .addJson(TestingSchema)
  .build();

describe('Protocol buffers and types.', () => {
  test('keys', () => {
    const keys = new Set<FeedKey>();
    const feedDescriptor = new FeedDescriptor('test');
    const feedKey: FeedKey = feedDescriptor.key;

    const message1 = createAdmit(feedKey);
    keys.add(message1.message.feedKey);

    const buffer = codec.encode(message1);
    const message2 = codec.decode(buffer);

    expect(message1).toEqual(message2);
    expect(message1.message.feedKey).toEqual(message2.message.feedKey);
    expect(Array.from(keys.values())[0]).toEqual(message2.message.feedKey);

    // Sets use strict === value equivalence.
    expect(keys.has(message2.message.feedKey)).toBeFalsy();
  });
});
