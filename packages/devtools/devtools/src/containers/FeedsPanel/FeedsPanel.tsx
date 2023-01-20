//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { useDevtools, useStream } from '@dxos/react-client';
import { ComplexSet } from '@dxos/util';

import { MessageTable, PublicKeySelector } from '../../components';

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

  return (
    <div className='flex flex-col'>
      <div className='flex flex-1 p-3 border-b border-slate-200 border-solid'>
        <div className='w-1/3 mr-2'>
          <PublicKeySelector
            keys={spaces.map(({ key }) => key)}
            value={selectedSpaceKey}
            placeholder={'Select space'}
            onSelect={(key) => {
              setMessages([]);
              setSelectedFeed(undefined);
              key && setSelectedSpaceKey(key);
            }}
          />
        </div>
        <div className='w-1/3 mr-2'>
          <PublicKeySelector
            keys={spaceFeeds}
            value={selectedFeed}
            placeholder={'Select feed'}
            onSelect={(key) => {
              setMessages([]);
              key && setSelectedFeed(key);
            }}
          />
        </div>
      </div>
      <div className='flex flex-1'>
        <MessageTable messages={messages} />
      </div>
    </div>
  );
};
