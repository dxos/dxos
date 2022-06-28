//
// Copyright 2020 DXOS.org
//

import { timestampSubstitutions, anySubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/crypto';


export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...anySubstitutions,
};
