//
// Copyright 2021 DXOS.org
//

import { GitCommit, HardDrive, LinkBreak, LinkSimple, LinkSimpleBreak, ShareNetwork } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { ConnectionInfo, SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { TreeView, TreeViewItem } from '@dxos/react-appkit';
import { useDevtools, useStream } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { ConnectionInfoView } from '../../components/ConnectionInfoView';
import { StorageInfo } from '@dxos/protocols/proto/dxos/devtools/host';
import { useAsyncEffect } from '@dxos/react-async';
import bytes from 'bytes';

const getInfoTree = (storageInfo: StorageInfo): TreeViewItem[] => [
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
      }
    ]
  },
]

const StoragePanel = () => {
  const devtoolsHost = useDevtools();
  const [storageInfo, setStorageInfo] = useState<StorageInfo | undefined>();

  useAsyncEffect(async () => {
    setStorageInfo(await devtoolsHost.getStorageInfo());
  }, []);

  if(!storageInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className='flex h-full overflow-hidden'>
      <TreeView
        items={getInfoTree(storageInfo)}
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
