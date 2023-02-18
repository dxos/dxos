//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useDevtools, useStream } from '@dxos/react-client';

import { useDevtoolsState } from './useDevtoolsContext';

export const useFeedMessages = ({ feedKey, maxBlocks = 100 }: { feedKey?: PublicKey; maxBlocks?: number }) => {
  const devtoolsHost = useDevtools();
  const { spaceInfo } = useDevtoolsState();

  // TODO(wittjosiah): FeedMessageBlock.
  const [messages, setMessages] = useState<SubscribeToFeedBlocksResponse.Block[]>([]);
  const { blocks } = useStream(
    () => devtoolsHost.subscribeToFeedBlocks({ spaceKey: spaceInfo?.key, feedKey, maxBlocks }),
    {},
    [spaceInfo, feedKey]
  );

  useEffect(() => {
    setMessages(blocks ?? []);
  }, [blocks]);

  useEffect(() => {
    setMessages(blocks ?? []);
  }, [blocks]);

  return messages;
};
