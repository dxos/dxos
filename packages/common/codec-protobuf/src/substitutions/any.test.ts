//
// Copyright 2026 DXOS.org
//

import { join } from 'node:path';

import * as pb from 'protobufjs';
import { describe, expect, test } from 'vitest';

import { Schema, anySubstitutions } from '..';

describe('anySubstitutions', () => {
  test('decodes Any when protobufjs toObject drops empty value bytes', async () => {
    const anyProto = await pb.load(join(__dirname, '../../test/proto/example/testing/any.proto'));
    const anotherProto = await pb.load(join(__dirname, '../../test/proto/example/testing/another.proto'));

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('example.testing.any.Wrapper');
    codec.addJson(anotherProto.toJSON());

    const decoded = anySubstitutions['google.protobuf.Any'].decode(
      { type_url: 'example.testing.another.EmptyMessage' },
      { messageName: 'example.testing.any.Wrapper', fieldName: 'payload' },
      schema,
      {},
    );

    expect(decoded).to.deep.equal({
      '@type': 'example.testing.another.EmptyMessage',
    });
  });
});
