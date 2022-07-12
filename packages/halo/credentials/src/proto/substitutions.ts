//
// Copyright 2020 DXOS.org
//

import { anySubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/protocols';

export default {
  ...anySubstitutions,
  ...publicKeySubstitutions
};
