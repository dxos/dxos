//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { waitForCondition } from '@dxos/async';
import { type Space } from '@dxos/client/echo';
import { DeviceType } from '@dxos/client/halo';
import { Context } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { useClient } from '@dxos/react-client';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';

import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsDispatch, useDevtoolsState } from '../../../hooks';
import { SyncStateInfo } from '../../echo';

export type TestingPanelProps = {
  onSpaceCreate?: (space: Space) => Promise<void>;
  onScriptPluginOpen?: (space: Space) => Promise<void>;
};

export const TestingPanel = ({ onSpaceCreate, onScriptPluginOpen }: TestingPanelProps) => {
  const client = useClient();
  const { space } = useDevtoolsState();
  const dispatch = useDevtoolsDispatch();

  const handleSpaceCreate = async () => {
    const agentDevice = client.halo.devices.get().find((device) => device.profile?.type === DeviceType.AGENT_MANAGED);
    const agentKey = agentDevice?.deviceKey.toHex();
    if (!agentKey) {
      log.warn('no agent key');
      return;
    }

    try {
      const response = await client.edge.http.createSpace(Context.default(), { agentKey });
      log.info('space created', { response });
      const space = await waitForCondition({
        condition: () => client.spaces.get(response.spaceId as SpaceId),
        timeout: 10000,
        interval: 100,
      });
      if (!space) {
        log.warn('space not found', { spaceId: response.spaceId });
        return;
      }

      await onSpaceCreate?.(space);
      dispatch((state) => ({ ...state, space }));
    } catch (error) {
      log.warn('space creation failed', { error });
    }
  };

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
          <Toolbar.IconButton icon='ph--plus--regular' label='Create Space' onClick={handleSpaceCreate} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col gap-4 p-4'>
        <IconButton icon='ph--code--regular' label='Open Script Plugin' onClick={handleScriptPluginOpen} />
        <div className='border-t border-separator'>{space && <SyncStateInfo space={space} />}</div>
      </Panel.Content>
    </Panel.Root>
  );
};
