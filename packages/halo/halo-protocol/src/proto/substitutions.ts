//
// Copyright 2020 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/protocols';

export default {
  ...anySubstitutions,
  ...timestampSubstitutions,
  ...publicKeySubstitutions
};
