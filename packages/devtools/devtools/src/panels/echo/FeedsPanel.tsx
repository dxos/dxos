//
// Copyright 2020 DXOS.org
//

import { Rows } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { TableColumn } from '@dxos/mosaic';
import { SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { humanize, range } from '@dxos/util';

import { MasterTable, PublicKeySelector } from '../../components';
import { SpaceToolbar } from '../../containers';
import { useDevtoolsDispatch, useDevtoolsState, useFeedMessages, useSpacesInfo } from '../../hooks';
import { Button } from '@dxos/aurora';
import { useDevtools, useStream } from '@dxos/react-client';

const columns: TableColumn<SubscribeToFeedBlocksResponse.Block>[] = [
  {
    Header: 'FeedKey',
    width: 120,
    accessor: (block) => {
      const feedKey = block.feedKey;
      return `${feedKey.truncate()} (${humanize(feedKey)})`;
    },
  },
  {
    Header: 'Sequence',
    width: 120,
    accessor: 'seq',
  },
];

const FeedsPanel = () => {
  const setContext = useDevtoolsDispatch();
  const { space, feedKey } = useDevtoolsState();
  const feedKeys = [...space?.internal.data.pipeline?.controlFeeds ?? [], ...space?.internal.data.pipeline?.dataFeeds ?? []];
  const devtoolsHost = useDevtools();
  const spacesInfo = useSpacesInfo();
  const [refreshCount, setRefreshCount] = useState(0);

  const {feeds = []} = useStream(() => devtoolsHost.subscribeToFeeds({feedKeys}), {}, [refreshCount])

  const messages = useFeedMessages({ feedKey });

  const handleSelect = (feedKey?: PublicKey) => {
    setContext((state) => ({ ...state, feedKey }));
  };

  const refresh = () => {
    setRefreshCount(refreshCount + 1);
  }

  const getLabel = (key: PublicKey) => {
    const type = space?.internal.data.pipeline?.controlFeeds?.includes(key) ? 'control' : 'data';

    const meta = feeds.find(feed => feed.feedKey.equals(key));

    if(meta) {
      return `${type} (${meta.length})`
    } else {
      return type
    }
  }

  const meta = feeds.find(feed => feedKey && feed.feedKey.equals(feedKey));

  return (
    <div className='flex flex-col overflow-hidden'>
      <SpaceToolbar>
        <div className='w-[400px]'>
          <PublicKeySelector
            keys={feedKeys}
            Icon={Rows}
            defaultValue={feedKey}
            placeholder={'Select feed'}
            getLabel={getLabel}
            onChange={handleSelect}
          />
          <Button onClick={refresh}>Refresh</Button>
        </div>
      </SpaceToolbar>
      <BitfieldDisplay value={meta?.downloaded ?? new Uint8Array()} length={meta?.length ?? 0} />
      <div className='flex flex-1 overflow-hidden'>
        <MasterTable<SubscribeToFeedBlocksResponse.Block> columns={columns} data={messages} />
      </div>
    </div>
  );
};

const MIN_SUBDIVISION_PIXELS = 10;
const MAX_SUBDIVISIONS = 100;

const BitfieldDisplay = ({ value, length }: { value: Uint8Array, length: number }) => {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (!container.current) return;
      const resizeObserver = new ResizeObserver(() => {
        if(!container.current) return;

        const width = container.current.clientWidth;
        setWidth(width);
      });
      resizeObserver.observe(container.current);
      return () => resizeObserver.disconnect(); // clean up 
  }, []);

  const subdivisions = Math.min(Math.min(Math.floor(width / MIN_SUBDIVISION_PIXELS), MAX_SUBDIVISIONS), length);

  const getColor = (index: number): string => {
    const feedBegin = Math.floor(index * length / subdivisions);
    let feedEnd = Math.ceil((index + 1) * length / subdivisions);
    if(feedEnd === feedBegin) feedEnd = feedBegin + 1;

    let count = 0;
    for (let i = feedBegin; i < feedEnd; i++) {
      const bit = (value[Math.floor(i / 8)] >> (7 - i % 8)) & 0x1;
      if(bit) count++;
    }

    const percent = count / (feedEnd - feedBegin);

    if(percent === 1) {
      return 'darkgreen'
    } else if(percent > 0) {
      return 'green'
    } else {
      return 'gray'
    }
  }

  return (
    <div ref={container} className='h-10 m-2 flex flex-row'>
      {range(subdivisions).map((index) => (
        <div key={index} className='h-full flex-1' style={{ backgroundColor: getColor(index), minWidth: 1 }} />
      ))}
    </div>
  )
}

export default FeedsPanel;
