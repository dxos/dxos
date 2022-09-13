//
// Copyright 2022 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';

export default {
  ...timestampSubstitutions,
  ...anySubstitutions
};
