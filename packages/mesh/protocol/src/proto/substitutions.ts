//
// Copyright 2021 DXOS.org
//

import { anySubstitutions } from '@dxos/codec-protobuf';

export default {
  // There's an issue with protobuf compiler inferring substitution types so we have to use a verbose form here.
  'google.protobuf.Any': {
    decode: anySubstitutions['google.protobuf.Any'].decode,
    encode: anySubstitutions['google.protobuf.Any'].encode
  }
};
