import { Schema } from "../src/codec"
import * as pb from 'protobufjs';
import { anySubstitutions } from "../src";
import { join } from "path";

describe('extending protobuf', () => {
  it('extends proto with another file', async () => {
    const anyProto = await pb.load(join(__dirname, './any.proto'))
    const anotherProto = await pb.load(join(__dirname, './another.proto'))

    const schema = new Schema(anyProto, anySubstitutions);
    const codec = schema.tryGetCodecForType('dxos.test.any.Wrapper');
    
    codec.addJson(anotherProto.toJSON())
    
    const data = {
      payload: {
        __type_url: 'dxos.test.another.AnotherMessage',
        foo: 'foo'
      }
    };

    const encoded = codec.encode(data)
    const decoded = codec.decode(encoded)

    expect(decoded).toEqual(data)
  })
})
