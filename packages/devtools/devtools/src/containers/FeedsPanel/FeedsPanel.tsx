//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Selector } from '@dxos/kai';
import { PublicKey } from '@dxos/keys';
import { useDevtools, useStream } from '@dxos/react-client';
import { ComplexSet, humanize } from '@dxos/util';

import { MessageTable } from '../../components';

const dropDoubledKeys = (keys: PublicKey[]) => {
  const set = new ComplexSet(PublicKey.hash, keys);
  return Array.from(set.values());
};

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
          <Selector
            options={spaces.map((space) => ({
              id: space.key.toHex(),
              title: humanize(space.key)
            }))}
            value={selectedSpaceKey?.toHex()}
            placeholder={'Select space'}
            onSelect={(key) => {
              key && setSelectedSpaceKey(PublicKey.fromHex(key));
              setSelectedFeed(undefined);
              setMessages([]);
            }}
          />
        </div>
        <div className='w-1/3 mr-2'>
          <Selector
            options={dropDoubledKeys(spaceFeeds).map((feedKey) => ({
              id: feedKey.toHex(),
              title: humanize(feedKey)
            }))}
            value={selectedFeed?.toHex()}
            placeholder={'Select feed'}
            onSelect={(key) => {
              key && setSelectedFeed(PublicKey.fromHex(key));
              setMessages([]);
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
