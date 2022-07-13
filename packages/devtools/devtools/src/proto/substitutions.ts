//
// Copyright 2021 DXOS.org
//

import { anySubstitutions, timestampSubstitutions } from '@dxos/codec-protobuf';
import { timeframeSubstitutions } from '@dxos/echo-protocol';
import type { ConnectionEvent } from '@dxos/network-manager';
import { publicKeySubstitutions } from '@dxos/protocols';

export default {
  ...timestampSubstitutions,
  ...publicKeySubstitutions,
  ...timeframeSubstitutions,
  ...anySubstitutions,

  // TODO(dmaretskyi): Use protobuf's built-in type and remove this.
  'dxos.devtools.SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo.Json': {
    encode: (value: ConnectionEvent) => ({ data: JSON.stringify(value) }),
    decode: (value: any) => JSON.parse(value.data) as ConnectionEvent
  }
};
