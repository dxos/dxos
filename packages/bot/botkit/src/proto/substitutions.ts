//
// Copyright 2021 DXOS.org
//

import { newAnySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/crypto';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...newAnySubstitutions,
};
