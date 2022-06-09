//
// Copyright 2021 DXOS.org
//

import { newAnySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/crypto';
import { timeframeSubstitutions } from '@dxos/echo-protocol';

export default {
  ...timeframeSubstitutions,
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...newAnySubstitutions
};
