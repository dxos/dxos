//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { buf } from '@dxos/protocols/buf';
import { SubscribeToFeedBlocksResponseSchema } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { type SubscribeToFeedBlocksResponse_Block } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { useDevtoolsState } from './useDevtoolsContext.tsx';

export const useFeedMessages = ({ feedKey, maxBlocks = 100 }: { feedKey?: PublicKey; maxBlocks?: number }) => {
  const devtoolsHost = useDevtools();
  const { space } = useDevtoolsState();

  // TODO(wittjosiah): FeedMessageBlock.
  const [messages, setMessages] = useState<SubscribeToFeedBlocksResponse_Block[]>([]);
  const blocks = useStream(
    () => devtoolsHost.subscribeToFeedBlocks({ spaceKey: space?.key, feedKey, maxBlocks }),
    buf.create(SubscribeToFeedBlocksResponseSchema, {}),
    [space, feedKey],
  );

  useEffect(() => {
    setMessages(blocks.blocks ?? []);
  }, [blocks]);

  return messages;
};
