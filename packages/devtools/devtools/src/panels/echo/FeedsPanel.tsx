//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';

import { MessageTable, PublicKeySelector } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages } from '../../hooks';

const FeedsPanel = () => {
  const setContext = useDevtoolsDispatch();
  const { spaceInfo: metadata, feedKey } = useDevtoolsState();

  const [feeds, setFeeds] = useState<PublicKey[]>([]);
  useEffect(() => {
    if (!metadata) {
      return;
    }

    setFeeds([metadata.genesisFeed, metadata.controlFeed, metadata.dataFeed]);
  }, [metadata]);

  const messages = useFeedMessages({ feedKey });

  const handleSelect = (feedKey?: PublicKey) => {
    setContext((state) => ({ ...state, feedKey }));
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

export default FeedsPanel;
