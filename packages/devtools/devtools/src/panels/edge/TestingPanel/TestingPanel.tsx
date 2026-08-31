//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';

import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState } from '../../../hooks';
import { SyncStateInfo } from '../../echo';

export type TestingPanelProps = {
  onScriptPluginOpen?: (space: Space) => Promise<void>;
};

export const TestingPanel = ({ onScriptPluginOpen }: TestingPanelProps) => {
  const { space } = useDevtoolsState();

  const handleScriptPluginOpen = async () => {
    if (!space) {
      log.warn('no space');
      return;
    }
    await onScriptPluginOpen?.(space);
  };

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <DataSpaceSelector />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col gap-4 p-4'>
        <IconButton icon='ph--code--regular' label='Open Script Plugin' onClick={handleScriptPluginOpen} />
        <div className='border-t border-separator'>{space && <SyncStateInfo space={space} />}</div>
      </Panel.Content>
    </Panel.Root>
  );
};
