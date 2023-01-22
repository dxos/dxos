//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useDevtools, useStream } from '@dxos/react-client';

import { MessageTable, PublicKeySelector } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsDispatch, useDevtoolsState } from '../../hooks';

export const FeedsPanel = () => {
  const setContext = useDevtoolsDispatch();
  const { space, feedKey } = useDevtoolsState();

  // Spaces subscription.
  const devtoolsHost = useDevtools();
  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];

  // TODO(wittjosiah): FeedMessageBlock.
  const [messages, setMessages] = useState<any[]>([]);
  const { blocks } = useStream(() => devtoolsHost.subscribeToFeedBlocks({ spaceKey: space?.key, feedKey }), {}, [
    spaces,
    feedKey
  ]);

  // TODO(burdon): Multiple feeds (for peers).
  // const feeds = devtoolsHost.subscribeToFeeds({ feedKeys: space?.key });

  const feeds: PublicKey[] = useMemo(() => {
    if (!spaces || !spaces) {
      return [];
    }

    const spaceInfo = spaces.find((space) => space.key.equals(space.key));
    return spaceInfo ? [spaceInfo.genesisFeed, spaceInfo.controlFeed, spaceInfo.dataFeed] : [];
  }, [spaces, space]);

  // TODO(burdon): Reset if space changed.
  useEffect(() => {
    if (feedKey && feeds.findIndex((key) => key.equals(feedKey)) === -1) {
      setContext((state) => ({ ...state, feedKey: undefined }));
    }

    setMessages([]);
  }, [space]);

  useEffect(() => {
    setMessages(blocks ?? []);
  }, [blocks]);

  const handleSelect = (feedKey?: PublicKey) => {
    setContext((state) => ({ ...state, feedKey }));
    setMessages([]);
  };

  return (
    <div className='flex flex-col'>
      <SpaceToolbar>
        <div className='w-1/2'>
          <PublicKeySelector keys={feeds} value={feedKey} placeholder={'Select feed'} onSelect={handleSelect} />
        </div>
      </SpaceToolbar>

      <div className='flex flex-1'>
        <MessageTable messages={messages} />
      </div>
    </div>
  );
};
