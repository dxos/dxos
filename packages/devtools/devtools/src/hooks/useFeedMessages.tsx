//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { buf } from '@dxos/protocols/buf';
import { decodeCompat } from '@dxos/protocols/buf-shape-compat';
import { SubscribeToFeedBlocksResponseSchema } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { useDevtoolsState } from './useDevtoolsContext';

export const useFeedMessages = ({ feedKey, maxBlocks = 100 }: { feedKey?: PublicKey; maxBlocks?: number }) => {
  const devtoolsHost = useDevtools();
  const { space } = useDevtoolsState();

  // TODO(wittjosiah): FeedMessageBlock.
  const [messages, setMessages] = useState<SubscribeToFeedBlocksResponse.Block[]>([]);
  const blocks = useStream(
    () => devtoolsHost.subscribeToFeedBlocks({ spaceKey: space?.key, feedKey, maxBlocks }),
    buf.create(SubscribeToFeedBlocksResponseSchema, {}),
    [space, feedKey],
  );

  useEffect(() => {
    // The panels read credential assertions by '@type', which is the protobuf.js Any substitution.
    const response = decodeCompat<SubscribeToFeedBlocksResponse>(
      SubscribeToFeedBlocksResponseSchema,
      buf.toBinary(SubscribeToFeedBlocksResponseSchema, blocks),
    );
    setMessages(response.blocks ?? []);
  }, [blocks]);

  return messages;
};
