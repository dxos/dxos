//
// Copyright 2021 DXOS.org
//

import { join } from 'node:path';
import * as pb from 'protobufjs';
import { describe, expect, test } from 'vitest';

import { Schema, anySubstitutions } from '../src';

describe('extending protobuf', () => {
  test('extends proto with another file', async () => {
    const anyProto = await pb.load(join(__dirname, './proto/example/testing/any.proto'));
    const anotherProto = await pb.load(join(__dirname, './proto/example/testing/another.proto'));

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('example.testing.any.Wrapper');
    codec.addJson(anotherProto.toJSON());

    const data = {
      payload: {
        '@type': 'example.testing.another.AnotherMessage',
        foo: 'foo',
      },
    };

    const encoded = codec.encode(data);
    const decoded = codec.decode(encoded);
    expect(decoded).to.deep.equal(data);
  });

  test('Extends proto with duplicate keys', async () => {
    const anyProto = await pb.load(join(__dirname, './proto/example/testing/any.proto'));
    const anotherProto = await pb.load(join(__dirname, './proto/example/testing/another-with-any.proto'));

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('example.testing.any.Wrapper');
    codec.addJson(anotherProto.toJSON());

    const data = {
      payload: {
        '@type': 'example.testing.another.AnotherMessageWithAny',
        foo: 'foo',
      },
    };

    const encoded = codec.encode(data);
    const decoded = codec.decode(encoded);
    expect(decoded).to.deep.equal(data);
  });
});

describe('proto3 defaults on decode', () => {
  // proto3 omits zero-value fields from the wire format. The decode mapper must restore them so that an
  // enum field whose default member is meaningful (e.g. a `kind` discriminator) is `0` rather than
  // `undefined` after a round-trip. See create-message-mapper.ts.
  const root = pb.parse(`
    syntax = "proto3";
    package example.defaults;
    enum Kind { DEVICE = 0; SPACE = 1; }
    message Msg {
      Kind kind = 1;
      int32 count = 2;
      string name = 3;
      bool flag = 4;
    }
  `).root;
  const schema = new Schema<any>(root, {});
  const codec = schema.getCodecForType('example.defaults.Msg');

  test('restores zero-value enum and scalar fields', ({ expect }) => {
    const decoded = codec.decode(codec.encode({ kind: 0, count: 0, name: '', flag: false }));
    expect(decoded.kind).to.equal(0);
    expect(decoded.count).to.equal(0);
    expect(decoded.name).to.equal('');
    expect(decoded.flag).to.equal(false);
  });

  test('preserves non-default enum values', ({ expect }) => {
    const decoded = codec.decode(codec.encode({ kind: 1, count: 7 }));
    expect(decoded.kind).to.equal(1);
    expect(decoded.count).to.equal(7);
  });
});
