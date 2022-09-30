//
// Copyright 2020 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';

import { publicKeySubstitutions } from '../keys';
import { timeframeSubstitutions } from '../timeframe';

export default {
  ...anySubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
  ...timestampSubstitutions
};
