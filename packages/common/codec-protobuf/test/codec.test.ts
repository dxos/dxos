//
// Copyright 2021 DXOS.org
//

import { join } from 'path';
import * as pb from 'protobufjs';

import { Schema, anySubstitutions } from '../src';

describe('extending protobuf', () => {
  it('extends proto with another file', async () => {
    const anyProto = await pb.load(join(__dirname, './proto/example/testing/any.proto'));
    const anotherProto = await pb.load(join(__dirname, './proto/example/testing/another.proto'));

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('example.testing.any.Wrapper');
    codec.addJson(anotherProto.toJSON());

    const data = {
      payload: {
        '@type': 'example.testing.another.AnotherMessage',
        foo: 'foo'
      }
    };

    const encoded = codec.encode(data);
    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(data);
  });

  it('Extends proto with duplicate keys', async () => {
    const anyProto = await pb.load(join(__dirname, './proto/example/testing/any.proto'));
    const anotherProto = await pb.load(join(__dirname, './proto/example/testing/another-with-any.proto'));

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('example.testing.any.Wrapper');
    codec.addJson(anotherProto.toJSON());

    const data = {
      payload: {
        '@type': 'example.testing.another.AnotherMessageWithAny',
        foo: 'foo'
      }
    };

    const encoded = codec.encode(data);
    const decoded = codec.decode(encoded);
    expect(decoded).toEqual(data);
  });
});
