//
// Copyright 2021 DXOS.org
//

import { join } from 'path';
import * as pb from 'protobufjs';

import { anySubstitutions } from '../src';
import { Schema } from '../src/schema';

describe('extending protobuf', () => {
  it('extends proto with another file', async () => {
    const anyProto = await pb.load(join(__dirname, './any.proto'));
    const anotherProto = await pb.load(join(__dirname, './another.proto'));

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('dxos.test.any.Wrapper');
    codec.addJson(anotherProto.toJSON());

    const data = {
      payload: {
        '@type': 'dxos.test.another.AnotherMessage',
        foo: 'foo'
      }
    };

    const encoded = codec.encode(data);
    const decoded = codec.decode(encoded);

    expect(decoded).toEqual(data);
  });

  it('Extends proto with duplicate keys', async () => {
    const anyProto = await pb.load(join(__dirname, './any.proto'));
    const anotherProtoWithAny = await pb.load(join(__dirname, './anotherWithAny.proto'));

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('dxos.test.any.Wrapper');

    codec.addJson(anotherProtoWithAny.toJSON());

    const data = {
      payload: {
        '@type': 'dxos.test.another.AnotherMessageWithAny',
        foo: 'foo'
      }
    };

    const encoded = codec.encode(data);
    const decoded = codec.decode(encoded);

    expect(decoded).toEqual(data);
  });
});
