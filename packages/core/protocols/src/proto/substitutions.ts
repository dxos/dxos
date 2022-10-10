//
// Copyright 2020 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';

import { publicKeySubstitutions } from '../keys.js';
import { timeframeSubstitutions } from '../timeframe.js';

export default {
  ...anySubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
  ...timestampSubstitutions
};
