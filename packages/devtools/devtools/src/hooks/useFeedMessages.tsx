//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { type SubscribeToFeedBlocksResponse_Block } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { useDevtoolsState } from './useDevtoolsContext';

export const useFeedMessages = ({ feedKey, maxBlocks = 100 }: { feedKey?: PublicKey; maxBlocks?: number }) => {
  const devtoolsHost = useDevtools();
  const { space } = useDevtoolsState();

  // TODO(wittjosiah): FeedMessageBlock.
  const [messages, setMessages] = useState<SubscribeToFeedBlocksResponse_Block[]>([]);
  const { blocks } = useStream(
    () =>
      devtoolsHost.subscribeToFeedBlocks({ spaceKey: space?.key as any, feedKey: feedKey as any, maxBlocks } as any),
    {} as any,
    [space, feedKey],
  );

  useEffect(() => {
    setMessages((blocks as any) ?? []);
  }, [blocks]);

  useEffect(() => {
    setMessages((blocks as any) ?? []);
  }, [blocks]);

  return messages;
};
