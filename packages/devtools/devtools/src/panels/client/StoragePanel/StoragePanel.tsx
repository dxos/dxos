//
// Copyright 2021 DXOS.org
//

import { GitCommit, HardDrive, Queue, Rows, Bookmarks, Bookmark, Files, FileArchive } from '@phosphor-icons/react';
import bytes from 'bytes';
import React, { type FC, type ReactNode, useEffect, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import {
  type GetBlobsResponse,
  type GetSnapshotsResponse,
  type StorageInfo,
  type StoredSnapshotInfo,
  type SubscribeToFeedsResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { useAsyncEffect } from '@dxos/react-async';
import { PublicKey, useClientServices } from '@dxos/react-client';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { DropdownMenu, Tree, TreeItem, Toolbar } from '@dxos/react-ui';
import { BitField } from '@dxos/util';

import { Bitbar, JsonView, PanelContainer } from '../../../components';

// TODO(burdon): Rewrite this panel as a table.

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

type Node = {
  id: string;
  Icon: FC;
  Element: ReactNode;
  items?: Node[];
  value?: SelectionValue;
};

const getInfoTree = (
  storageInfo: StorageInfo,
  feedInfo: SubscribeToFeedsResponse,
  snapshots: StoredSnapshotInfo[],
  blobs: BlobMeta[],
): Node[] => [
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
              value: { kind: 'feed', feed },
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
              value: { kind: 'blob', blob },
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
              value: { kind: 'snapshot' },
            })),
          },
        ],
      },
    ],
  },
];

export const StoragePanel = () => {
  const devtoolsHost = useDevtools();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | undefined>();
  const [snapshotInfo, setSnapshotInfo] = useState<GetSnapshotsResponse | undefined>();
  const [blobsInfo, setBlobsInfo] = useState<GetBlobsResponse | undefined>();
  const feeds = useStream(() => devtoolsHost.subscribeToFeeds({}), {}, []);
  const services = useClientServices();
  if (!services) {
    return null;
  }

  const [selected, setSelected] = useState<Node | undefined>();

  const refresh = async () => {
    setIsRefreshing(true);
    let retry = false;

    let storageInfo: StorageInfo | undefined;
    let snapshotInfo: GetSnapshotsResponse | undefined;
    let blobsInfo: GetBlobsResponse | undefined;

    try {
      storageInfo = await devtoolsHost.getStorageInfo();
    } catch (err) {
      log.catch(err);
      retry = true;
    }

    try {
      snapshotInfo = await devtoolsHost.getSnapshots();
    } catch (err) {
      log.catch(err);
      retry = true;
    }

    try {
      blobsInfo = await devtoolsHost.getBlobs();
    } catch (err) {
      log.catch(err);
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

    const build = (items: Node[]) => {
      for (const item of items) {
        if (item.id !== undefined && item.id === selected.id) {
          setSelected(item);
          return;
        }

        if (item.items) {
          build(item.items);
        }
      }
    };

    build(items);
  }, [items]);

  const selectedValue = selected?.value as SelectionValue | undefined;

  const DataItems: FC<{ items: Node[] }> = ({ items = [] }) => {
    return (
      <>
        {items.map((item) => {
          const { id, Icon, Element, items } = item;
          return (
            <TreeItem.Root key={id} collapsible={!!items?.length} open>
              <div role='none' className='flex grow items-center gap-2 font-mono' onClick={() => setSelected(item)}>
                <Icon />
                {Element}
              </div>
              <TreeItem.Body className='pis-4'>
                <Tree.Branch>{items && <DataItems items={items} />}</Tree.Branch>
              </TreeItem.Body>
            </TreeItem.Root>
          );
        })}
      </>
    );
  };

  const DataTree: FC<{ items: Node[] }> = ({ items = [] }) => {
    return (
      <Tree.Root>
        <DataItems items={items} />
      </Tree.Root>
    );
  };

  return (
    <PanelContainer
      classNames='flex-row divide-x'
      toolbar={
        <Toolbar.Root>
          <Toolbar.Button onClick={refresh} disabled={isRefreshing}>
            Refresh
          </Toolbar.Button>
          <div className='grow' />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Toolbar.Button>Reset Storage</Toolbar.Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content side='top' classNames='z-[51]'>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item
                    onClick={async () => {
                      await services?.SystemService.reset();
                      location.reload();
                    }}
                  >
                    Confirm Reset Storage?
                  </DropdownMenu.Item>
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </Toolbar.Root>
      }
    >
      <div className='flex w-1/3 overflow-auto p-2'>
        <DataTree items={items} />
      </div>

      {selectedValue && (
        <div className='flex flex-col grow w-2/3 overflow-auto'>
          {selectedValue.kind === 'blob' && (
            <>
              <div className='p-1'>Downloaded {formatPercent(calculateBlobProgress(selectedValue.blob))}</div>
              <Bitbar
                value={selectedValue.blob.bitfield ?? new Uint8Array()}
                length={Math.ceil(selectedValue.blob.length / selectedValue.blob.chunkSize)}
                className='m-2'
              />
              <JsonView data={selectedValue.blob} />
            </>
          )}

          {selectedValue.kind === 'feed' && (
            <>
              <Bitbar
                value={selectedValue.feed.downloaded ?? new Uint8Array()}
                length={Math.ceil(selectedValue.feed.length ?? 0)}
                className='m-2'
              />
              <JsonView data={selectedValue.feed} />
            </>
          )}
        </div>
      )}
    </PanelContainer>
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

export type TreeItemTextProps = {
  primary: ReactNode;
  secondary?: ReactNode;
};

const TreeItemText = ({ primary, secondary }: TreeItemTextProps) => (
  <div className='flex gap-2 overflow-hidden whitespace-nowrap'>
    <span className='font-mono'>{primary}</span>
    <span className='text-gray-400'>{secondary}</span>
  </div>
);
