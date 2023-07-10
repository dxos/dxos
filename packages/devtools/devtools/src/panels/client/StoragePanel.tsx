//
// Copyright 2021 DXOS.org
//

import { GitCommit, HardDrive, Queue, Rows, Bookmarks, Bookmark, Files, FileArchive } from '@phosphor-icons/react';
import bytes from 'bytes';
import React, { useEffect, useMemo, useState } from 'react';

import { Button, ButtonGroup } from '@dxos/aurora';
import {
  GetBlobsResponse,
  GetSnapshotsResponse,
  StorageInfo,
  StoredSnapshotInfo,
  SubscribeToFeedsResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { TreeView, TreeViewItem } from '@dxos/react-appkit';
import { useAsyncEffect } from '@dxos/react-async';
import { PublicKey, useDevtools, useStream } from '@dxos/react-client';
import { BitField } from '@dxos/util';

import { BitfieldDisplay, JsonView } from '../../components';
import { TreeItemText } from '../../components/TreeItemText';

type SelectionValue =
  | {
      kind: 'feed';
      feed: SubscribeToFeedsResponse.Feed;
    }
  | {
      kind: 'blob';
      blob: BlobMeta;
    }
  | {
      kind: 'snapshot';
    };

const getInfoTree = (
  storageInfo: StorageInfo,
  feedInfo: SubscribeToFeedsResponse,
  snapshots: StoredSnapshotInfo[],
  blobs: BlobMeta[],
): TreeViewItem[] => [
  {
    id: 'origin',
    Icon: GitCommit,
    Element: (
      <TreeItemText
        primary='origin'
        secondary={`${bytes.format(storageInfo.originUsage)} / ${bytes.format(storageInfo.usageQuota)} ${formatPercent(
          storageInfo.originUsage / storageInfo.usageQuota,
        )}`}
      />
    ),
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
            items: feedInfo.feeds?.map((feed) => ({
              id: feed.feedKey.toHex(),
              Icon: Rows,
              Element: <TreeItemText primary={feed.feedKey.truncate()} secondary={bytes.format(feed.bytes)} />,
              value: { kind: 'feed', feed } satisfies SelectionValue,
            })),
          },
          {
            id: 'blobs',
            Icon: Files,
            Element: <TreeItemText primary='blobs' secondary={blobs.length} />,
            items: blobs.map((blob) => ({
              id: PublicKey.from(blob.id).toHex(),
              Icon: FileArchive,
              Element: (
                <TreeItemText primary={PublicKey.from(blob.id).truncate()} secondary={bytes.format(blob.length)} />
              ),
              value: { kind: 'blob', blob } satisfies SelectionValue,
            })),
          },
          {
            id: 'snapshots',
            Icon: Bookmarks,
            Element: <TreeItemText primary='snapshots' secondary={snapshots.length} />,
            items: snapshots.map((snapshot) => ({
              id: snapshot.key,
              Icon: Bookmark,
              Element: <TreeItemText primary={snapshot.key} secondary={bytes.format(snapshot.size)} />,
              value: { kind: 'snapshot' } satisfies SelectionValue,
            })),
          },
        ],
      },
    ],
  },
];

const StoragePanel = () => {
  const devtoolsHost = useDevtools();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | undefined>();
  const [snapshotInfo, setSnapshotInfo] = useState<GetSnapshotsResponse | undefined>();
  const [blobsInfo, setBlobsInfo] = useState<GetBlobsResponse | undefined>();
  const feeds = useStream(() => devtoolsHost.subscribeToFeeds({}), {}, []);

  const [selected, setSelected] = useState<TreeViewItem | undefined>();

  const refresh = async () => {
    setIsRefreshing(true);
    let retry = false;

    let storageInfo: StorageInfo | undefined;
    let snapshotInfo: GetSnapshotsResponse | undefined;
    let blobsInfo: GetBlobsResponse | undefined;

    try {
      storageInfo = await devtoolsHost.getStorageInfo();
    } catch (err) {
      console.error(err);
      retry = true;
    }

    try {
      snapshotInfo = await devtoolsHost.getSnapshots();
    } catch (err) {
      console.error(err);
      retry = true;
    }

    try {
      blobsInfo = await devtoolsHost.getBlobs();
    } catch (err) {
      console.error(err);
      retry = true;
    }

    setBlobsInfo(blobsInfo);
    setStorageInfo(storageInfo);
    setSnapshotInfo(snapshotInfo);
    setIsRefreshing(false);

    if (retry) {
      setTimeout(refresh, 500);
    }
  };

  useAsyncEffect(refresh, []);

  const items = useMemo(
    () =>
      getInfoTree(
        storageInfo ?? {
          type: '',
          originUsage: 0,
          storageUsage: 0,
          usageQuota: 0,
        },
        feeds,
        snapshotInfo?.snapshots ?? [],
        blobsInfo?.blobs ?? [],
      ),
    [storageInfo, snapshotInfo, blobsInfo],
  );

  useEffect(() => {
    if (!selected) {
      return;
    }
    const rec = (items: TreeViewItem[]) => {
      for (const item of items) {
        if (item.id !== undefined && item.id === selected.id) {
          setSelected(item);
          return;
        }
        if (item.items) {
          rec(item.items);
        }
      }
    };
    rec(items);
  }, [items]);

  const selectedValue = selected?.value as SelectionValue | undefined;

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex items-end m-2 gap-2 w-[600px]'>
        <ButtonGroup>
          <Button onClick={refresh} disabled={isRefreshing}>
            Refresh
          </Button>
        </ButtonGroup>
      </div>
      <div className='flex h-full overflow-hidden'>
        <div className='flex flex-col w-1/3 overflow-auto border-r'>
          <TreeView
            items={items}
            expanded={['origin', 'storage']}
            onSelect={(item) => setSelected(item)}
            selected={selected?.id}
            slots={{
              value: {
                className: 'overflow-hidden text-gray-400 truncate pl-2',
              },
            }}
          />
        </div>
        {selectedValue && (
          <div className='flex flex-1 flex-col w-2/3 overflow-auto'>
            {selectedValue.kind === 'blob' && (
              <>
                <div>Downloaded: {formatPercent(calculateBlobProgress(selectedValue.blob))}</div>
                <BitfieldDisplay
                  value={selectedValue.blob.bitfield ?? new Uint8Array()}
                  length={Math.ceil(selectedValue.blob.length / selectedValue.blob.chunkSize)}
                />
                <JsonView data={selectedValue.blob} />
              </>
            )}
            {selectedValue.kind === 'feed' && (
              <>
                <BitfieldDisplay
                  value={selectedValue.feed.downloaded ?? new Uint8Array()}
                  length={Math.ceil(selectedValue.feed.length ?? 0)}
                />
                <JsonView data={selectedValue.feed} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const calculateBlobProgress = (blob: BlobMeta) => {
  if (blob.state === BlobMeta.State.FULLY_PRESENT) {
    return 1;
  }

  return (
    BitField.count(blob.bitfield ?? new Uint8Array(), 0, (blob.bitfield?.length ?? 0) * 8) /
    Math.ceil(blob.length / blob.chunkSize)
  );
};

const formatPercent = (ratio: number) => (ratio * 100).toFixed(0) + '%';

export default StoragePanel;
