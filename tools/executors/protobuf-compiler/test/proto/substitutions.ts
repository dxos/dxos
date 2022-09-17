//
// Copyright 2022 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';

import { MyInterfaceSubstitution } from '../my-interface';
import { MyKey } from '../my-key';

export default {
  ...anySubstitutions,
  ...timestampSubstitutions,
  'dxos.test.Key': {
    encode: (value: MyKey) => ({ data: value.keyData }),
    decode: (value: any) => new MyKey(value.data)
  },
  'dxos.test.SubstitutedByInterface': {
    encode: (value: MyInterfaceSubstitution) => value,
    decode: (value: any): MyInterfaceSubstitution => value
  }
};
