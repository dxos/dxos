//
// Copyright 2022 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';

import { MyInterfaceSubstitution } from '../my-interface';
import { MyKey } from '../my-key';

export default {
  ...anySubstitutions,
  ...timestampSubstitutions,
  'example.testing.Key': {
    encode: (value: MyKey) => ({ data: value.data }),
    decode: (value: any) => new MyKey(value.data)
  },
  'example.testing.SubstitutedByInterface': {
    encode: (value: MyInterfaceSubstitution) => value,
    decode: (value: any): MyInterfaceSubstitution => value
  }
};
