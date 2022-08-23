//
// Copyright 2020 DXOS.org
//

import { timestampSubstitutions } from '@dxos/codec-protobuf';
import { codec, Message } from '@dxos/credentials';
import { publicKeySubstitutions, timeframeSubstitutions } from '@dxos/protocols';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
};
