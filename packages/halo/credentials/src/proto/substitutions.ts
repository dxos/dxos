//
// Copyright 2020 DXOS.org
//

import { Schema as CodecSchema } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/crypto';

import { SecretKey } from '../keys';
import { DecodedAny } from './any';

export default {
  'google.protobuf.Any': {
    encode: (value: DecodedAny, schema: CodecSchema<any>) => {
      const codec = schema.tryGetCodecForType(value.__type_url);
      const data = codec.encode(value);
      return {
        type_url: value.__type_url,
        value: data
      };
    },
    decode: (value: any, schema: CodecSchema<any>): any => { // TODO(marik-d): Should be KnownAny
      const codec = schema.tryGetCodecForType(value.type_url);
      const data = codec.decode(value.value);
      return {
        ...data,
        __type_url: value.type_url
      };
    }
  },
  'dxos.halo.keys.PubKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(value.data)
  },
  'dxos.halo.keys.PrivKey': {
    encode: (value: SecretKey) => ({ data: value }),
    decode: (value: any) => Buffer.from(value.data)
  }
};
