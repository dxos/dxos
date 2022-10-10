//
// Copyright 2022 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';

import { MyInterfaceSubstitution } from '../my-interface.js';
import { MyKey } from '../my-key.js';

export default {
  ...anySubstitutions,
  ...timestampSubstitutions,
  'example.testing.types.Key': {
    encode: (value: MyKey) => ({ data: value.data }),
    decode: (value: any) => new MyKey(value.data)
  },
  'example.testing.types.SubstitutedByInterface': {
    encode: (value: MyInterfaceSubstitution) => value,
    decode: (value: any): MyInterfaceSubstitution => value
  }
};
