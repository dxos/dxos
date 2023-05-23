//
// Copyright 2021 DXOS.org
//

import { GitCommit, HardDrive, LinkSimple, ShareNetwork } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { TreeView, TreeViewItem } from '@dxos/react-appkit';
import { useDevtools, useStream } from '@dxos/react-client';

import { StorageInfo, SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useAsyncEffect } from '@dxos/react-async';
import bytes from 'bytes';
import { humanize } from '@dxos/util';

const getInfoTree = (storageInfo: StorageInfo, feedInfo: SubscribeToFeedsResponse): TreeViewItem[] => [
  {
    id: 'origin',
    Icon: GitCommit,
    Element: (
      <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
        <span>origin</span>
        <span className='text-gray-400'>{bytes.format(storageInfo.originUsage)} / {bytes.format(storageInfo.usageQuota)} {formatPercent(storageInfo.originUsage / storageInfo.usageQuota)}</span>
      </div>
    ),
    items: [
      {
        id: 'storage',
        Icon: HardDrive,
        Element: (
          <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
            <span>{storageInfo.type}</span>
            <span className='text-gray-400'>{bytes.format(storageInfo.storageUsage)}</span>
          </div>   
        ),
        items: [
          {
            id: 'feeds',
            Icon: ShareNetwork,
            Element: (
              <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
                <span>feeds</span>
                <span className='text-gray-400'>{feedInfo.feeds?.length ?? 0}</span>
              </div>   
            ),
            items: feedInfo.feeds?.map(feed => ({
              id: feed.feedKey.toHex(),
              Icon: LinkSimple,
              Element: (
                <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
                  <span>{humanize(feed.feedKey)}</span>
                  <span className='text-gray-400'>{bytes.format(feed.diskUsage)}</span>
                </div>
              ),
            }))
          }
        ]
      }
    ]
  },
]

const StoragePanel = () => {
  const devtoolsHost = useDevtools();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | undefined>();
  const feeds = useStream(() => devtoolsHost.subscribeToFeeds({}), {}, []);

  useAsyncEffect(async () => {
    setStorageInfo(await devtoolsHost.getStorageInfo());
  }, []);

  if(!storageInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className='flex h-full overflow-hidden'>
      <TreeView
        items={getInfoTree(storageInfo, feeds)}
        expanded={['origin', 'storage']}
        slots={{
          value: {
            className: 'overflow-hidden text-gray-400 truncate pl-2'
          }
        }}
      />
    </div>
  );
};

const formatPercent = (ratio: number) => (ratio * 100).toFixed(0) + '%';

export default StoragePanel;
