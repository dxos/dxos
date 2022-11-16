//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useDevtools, useStream } from '@dxos/react-client';

import { KeySelect, MessageTable, Panel } from '../../components';

export const FeedsPanel = () => {
  const devtoolsHost = useDevtools();
  if (!devtoolsHost) {
    return null;
  }

  const [selectedSpaceKey, setSelectedSpaceKey] = useState<PublicKey>();
  const [selectedFeed, setSelectedFeed] = useState<PublicKey>();

  const spaces = useStream(() => devtoolsHost.subscribeToSpaces({}), {}).spaces ?? [];
  const spaceFeeds = useMemo(() => {
    if (!selectedSpaceKey || !spaces) {
      return [];
    }
    const space = spaces.find((space) => space.key.equals(selectedSpaceKey));
    return space ? [space.genesisFeed, space.controlFeed, space.dataFeed] : [];
  }, [spaces, selectedSpaceKey]);
  // TODO(wittjosiah): FeedMessageBlock.
  const [messages, setMessages] = useState<any[]>([]);
  const { blocks } = useStream(
    () => devtoolsHost.subscribeToFeedBlocks({ spaceKey: selectedSpaceKey, feedKey: selectedFeed }),
    {},
    [selectedSpaceKey, selectedFeed]
  );
  useEffect(() => {
    setMessages(blocks ?? []);
  }, [blocks]);

  const handleSpaceChange = (key: PublicKey | undefined) => {
    setSelectedSpaceKey(key);
    setSelectedFeed(undefined);
    setMessages([]);
  };

  const handleFeedChange = (feedKey: PublicKey | undefined) => {
    setSelectedFeed(feedKey);
    setMessages([]);
  };
  return (
    <Panel
      controls={
        <>
          <KeySelect
            id='space-select'
            label='Space'
            keys={spaces.map(({ key }) => key)}
            selected={selectedSpaceKey}
            onChange={handleSpaceChange}
          />
          <KeySelect
            id='feed-select'
            label='Feed'
            keys={[...new Set(spaceFeeds)]}
            selected={selectedFeed}
            onChange={handleFeedChange}
          />
        </>
      }
    >
      <MessageTable messages={messages} />
    </Panel>
  );
};
