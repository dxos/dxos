//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useDevtools, useStream } from '@dxos/react-client';

import { useDevtoolsState } from './useDevtoolsContext';

export const useFeedMessages = ({ feedKey }: { feedKey?: PublicKey }) => {
  const devtoolsHost = useDevtools();
  const { spaceInfo } = useDevtoolsState();

  // TODO(wittjosiah): FeedMessageBlock.
  const [messages, setMessages] = useState<any[]>([]);
  const { blocks } = useStream(() => devtoolsHost.subscribeToFeedBlocks({ spaceKey: spaceInfo?.key, feedKey }), {}, [
    spaceInfo,
    feedKey
  ]);

  useEffect(() => {
    setMessages(blocks ?? []);
  }, [blocks]);

  useEffect(() => {
    setMessages(blocks ?? []);
  }, [blocks]);

  return messages;
};
