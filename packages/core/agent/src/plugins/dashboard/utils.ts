//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { type RpcPort } from '@dxos/rpc';

export const getGossipRPCPort = ({ space, channelName }: { space: Space; channelName: string }): RpcPort => ({
  send: (message) => space.postMessage(channelName, { '@type': 'google.protobuf.Any', value: message }),
  subscribe: (callback) =>
    space.listen(channelName, (gossipMessage) => {
      return callback(gossipMessage.payload.value);
    }),
});
