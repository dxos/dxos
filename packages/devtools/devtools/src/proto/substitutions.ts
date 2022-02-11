//
// Copyright 2021 DXOS.org
//

import { newAnySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { publicKeySubstitutions } from '@dxos/crypto';
import { timeframeSubstitutions } from '@dxos/echo-protocol';
import type { ConnectionEvent } from '@dxos/network-manager';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
  ...newAnySubstitutions,

  // TODO(dmaretskyi): Use protobuf's built-in type and remove this.
  'dxos.devtools.SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo.Json': {
    encode: (value: ConnectionEvent) => ({ data: JSON.stringify(value) }),
    decode: (value: any) => JSON.parse(value.data) as ConnectionEvent
  },
};
