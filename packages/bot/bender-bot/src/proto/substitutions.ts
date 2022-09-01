//
// Copyright 2021 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions, timeframeSubstitutions } from '@dxos/protocols';

export default {
  ...timestampSubstitutions,
  // ...publicKeySubstitutions,
  // ...timeframeSubstitutions,
  ...anySubstitutions,
};
