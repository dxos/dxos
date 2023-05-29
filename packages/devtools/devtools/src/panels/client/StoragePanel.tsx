//
// Copyright 2021 DXOS.org
//

import { GitCommit, HardDrive, LinkSimple, ShareNetwork, Queue, Rows, Bookmarks, Bookmark } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { TreeView, TreeViewItem } from '@dxos/react-appkit';
import { useDevtools, useStream } from '@dxos/react-client';

import { GetSnapshotsResponse, StorageInfo, StoredSnapshotInfo, SubscribeToFeedsResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { useAsyncEffect } from '@dxos/react-async';
import bytes from 'bytes';
import { humanize } from '@dxos/util';
import { Button, ButtonGroup, DensityProvider } from '@dxos/aurora';
import { TreeItemText } from '../../components/TreeItemText';

const getInfoTree = (storageInfo: StorageInfo, feedInfo: SubscribeToFeedsResponse, snapshots: StoredSnapshotInfo[]): TreeViewItem[] => [
  {
    id: 'origin',
    Icon: GitCommit,
    Element: <TreeItemText primary='origin' secondary={`${bytes.format(storageInfo.originUsage)} / ${bytes.format(storageInfo.usageQuota)} ${formatPercent(storageInfo.originUsage / storageInfo.usageQuota)}`} />,
    items: [
      {
        id: 'storage',
        Icon: HardDrive,
        Element: <TreeItemText primary={storageInfo.type} secondary={bytes.format(storageInfo.storageUsage)} />,
        items: [
          {
            id: 'feeds',
            Icon: Queue,
            Element: <TreeItemText primary='feeds' secondary={feedInfo.feeds?.length ?? 0} />,
            items: feedInfo.feeds?.map(feed => ({
              id: feed.feedKey.toHex(),
              Icon: Rows,
              Element: <TreeItemText primary={humanize(feed.feedKey)} secondary={bytes.format(feed.diskUsage)} />,
            }))
          },
          {
            id: 'snapshots',
            Icon: Bookmarks,
            Element: <TreeItemText primary='snapshots' secondary={snapshots.length} />,
            items: snapshots.map(snapshot => ({
              id: snapshot.key,
              Icon: Bookmark,
              Element: <TreeItemText primary={snapshot.key} secondary={bytes.format(snapshot.size)} />,
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
  const [snapshotInfo, setSnapshotInfo] = useState<GetSnapshotsResponse | undefined>();
  const feeds = useStream(() => devtoolsHost.subscribeToFeeds({}), {}, []);

  const refresh = async () => {
    let storageInfo: StorageInfo | undefined = undefined;
    let snapshotInfo: GetSnapshotsResponse | undefined = undefined;

    try {
      storageInfo = await devtoolsHost.getStorageInfo();
    } catch (err) {
      console.error(err);
    }

    try {
      snapshotInfo = await devtoolsHost.getSnapshots();
    } catch (err) {
      console.error(err);
    }

    setStorageInfo(storageInfo);
    setSnapshotInfo(snapshotInfo);
  };

  useAsyncEffect(refresh, []);

  if (!storageInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex items-end m-2 gap-2 w-[600px]'>
        <ButtonGroup>
          <Button onClick={refresh}>Refresh</Button>
        </ButtonGroup>
      </div>
      <div className='flex h-full overflow-hidden'>
        <TreeView
          items={getInfoTree(storageInfo, feeds, snapshotInfo?.snapshots ?? [])}
          expanded={['origin', 'storage']}
          slots={{
            value: {
              className: 'overflow-hidden text-gray-400 truncate pl-2'
            }
          }}
        />
      </div>
    </div>
  );
};

const formatPercent = (ratio: number) => (ratio * 100).toFixed(0) + '%';

export default StoragePanel;
