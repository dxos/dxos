//
// Copyright 2021 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { timeframeSubstitutions } from '@dxos/echo-protocol';
import { publicKeySubstitutions } from '@dxos/protocols';

export default {
  ...timeframeSubstitutions,
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...anySubstitutions
};
