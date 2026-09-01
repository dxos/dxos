//
// Copyright 2021 DXOS.org
//

import bytes from 'bytes';
import React, { type FC, type ReactNode, useEffect, useMemo, useState } from 'react';

import { log } from '@dxos/log';
import { type DevtoolsHost } from '@dxos/protocols/rpc';
import { useClient } from '@dxos/react-client';
import { useDevtools, useStream } from '@dxos/react-client/devtools';
import { useAsyncEffect } from '@dxos/react-hooks';
import { DropdownMenu, Icon, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';

import { Bitbar, JsonView } from '../../../components/index.ts';

// TODO(burdon): Rewrite this panel as a table.

type SelectionValue =
  | {
      kind: 'feed';
      feed: DevtoolsHost.SubscribeToFeedsResponse.Feed;
    }
  | {
      kind: 'snapshot';
    };

type Node = {
  id: string;
  iconName: string;
  Element: ReactNode;
  items?: Node[];
  value?: SelectionValue;
};

const getInfoTree = (
  storageInfo: DevtoolsHost.StorageInfo,
  feedInfo: DevtoolsHost.SubscribeToFeedsResponse,
  snapshots: DevtoolsHost.StoredSnapshotInfo[],
): Node[] => [
  {
    id: 'origin',
    iconName: 'ph--git-commit--regular',
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
        iconName: 'ph--hard-drive--regular',
        Element: <TreeItemText primary={storageInfo.type} secondary={bytes.format(storageInfo.storageUsage)} />,
        items: [
          {
            id: 'feeds',
            iconName: 'ph--queue--regular',
            Element: <TreeItemText primary='feeds' secondary={feedInfo.feeds?.length ?? 0} />,
            items: feedInfo.feeds?.map((feed) => ({
              id: feed.feedKey.toHex(),
              iconName: 'ph--rows--regular',
              Element: <TreeItemText primary={feed.feedKey.truncate()} secondary={bytes.format(feed.bytes)} />,
              value: { kind: 'feed', feed },
            })),
          },
          {
            id: 'snapshots',
            iconName: 'ph--bookmarks--regular',
            Element: <TreeItemText primary='snapshots' secondary={snapshots.length} />,
            items: snapshots.map((snapshot) => ({
              id: snapshot.key,
              iconName: 'ph--bookmark--regular',
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
  const [storageInfo, setStorageInfo] = useState<DevtoolsHost.StorageInfo | undefined>();
  const [snapshotInfo, setSnapshotInfo] = useState<DevtoolsHost.GetSnapshotsResponse | undefined>();
  const feeds = useStream(() => devtoolsHost.subscribeToFeeds({}), {}, []);
  const client = useClient();
  const services = client.services.services;
  if (!services) {
    return null;
  }

  const [selected, setSelected] = useState<Node | undefined>();

  const refresh = async () => {
    setIsRefreshing(true);
    let retry = false;

    let storageInfo: DevtoolsHost.StorageInfo | undefined;
    let snapshotInfo: DevtoolsHost.GetSnapshotsResponse | undefined;

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
      ),
    [storageInfo, snapshotInfo],
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

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
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
              <DropdownMenu.Content side='top'>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item
                    onClick={async () => {
                      await services?.SystemService?.reset();
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
      </Panel.Toolbar>
      <Panel.Content classNames='grid grid-cols-2 divide-x divide-separator'>
        <DataTree items={items} onSelect={setSelected} />

        {selectedValue && (
          <ScrollArea.Root thin>
            <ScrollArea.Viewport classNames='divide-y divide-subdued-separator'>
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
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Content>
    </Panel.Root>
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
    <span className='text-neutral-400'>{secondary}</span>
  </div>
);

const DataTree: FC<{ items: Node[]; onSelect: (item: Node) => void }> = ({ items = [], onSelect }) => {
  return (
    <div role='tree' className='p-2'>
      <DataItems items={items} onSelect={onSelect} />
    </div>
  );
};

const DataItems: FC<{ items: Node[]; onSelect: (item: Node) => void }> = ({ items = [], onSelect }) => {
  return (
    <>
      {items.map((item) => {
        const { id, iconName, Element, items } = item;
        return (
          <div key={id} role='treeitem'>
            <div className='flex grow items-center gap-2 font-mono' onClick={() => onSelect(item)}>
              <Icon icon={iconName} />
              {Element}
            </div>
            {items && items.length > 0 && (
              <div role='group' className='ps-4'>
                <DataItems items={items} onSelect={onSelect} />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
