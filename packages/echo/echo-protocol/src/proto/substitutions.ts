//
// Copyright 2020 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions, timeframeSubstitutions } from '@dxos/protocols';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
  ...anySubstitutions
};
