//
// Copyright 2021 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';

export default {
  ...timestampSubstitutions,
  ...anySubstitutions
};
