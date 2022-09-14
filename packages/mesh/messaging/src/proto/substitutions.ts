//
// Copyright 2021 DXOS.org
//

import { timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/protocols';

export default {
  ...publicKeySubstitutions,
  ...timestampSubstitutions
};
