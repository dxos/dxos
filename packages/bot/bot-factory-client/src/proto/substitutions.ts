//
// Copyright 2021 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/protocols';

export default {
  ...anySubstitutions,
  ...publicKeySubstitutions,
  ...timestampSubstitutions
};
