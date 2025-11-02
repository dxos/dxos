//
// Copyright 2020 DXOS.org
//

import React, { type FC, useMemo, useState } from 'react';

import { MulticastObservable } from '@dxos/async';
import { SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type Space } from '@dxos/react-client/echo';
import { useMulticastObservable } from '@dxos/react-hooks';
import { Toolbar } from '@dxos/react-ui';

import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useDevtoolsState, useSpacesInfo } from '../../../hooks';

import { FeedTable, type FeedTableProps } from './FeedTable';
import { PipelineTable, type PipelineTableProps } from './PipelineTable';
import { SpaceProperties } from './SpaceProperties';
import { SyncStateInfo } from './SyncStateInfo';

export type SpaceInfoPanelProps = {
  space?: Space;
  onSelectFeed?: FeedTableProps['onSelect'];
  onSelectPipeline?: PipelineTableProps['onSelect'];
};

export const SpaceInfoPanel: FC<SpaceInfoPanelProps> = (props) => {
  const [, forceUpdate] = useState({});
  const state = useDevtoolsState();
  const space = props.space ?? state.space;

  // TODO(dmaretskyi): We don't need SpaceInfo anymore?
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => info.key.equals(space?.key));
  const pipelineState = useMulticastObservable(space?.pipeline ?? MulticastObservable.empty());

  const toggleActive = async () => {
    const state = space!.state.get();
    if (state === SpaceState.SPACE_INACTIVE) {
      await space!.open();
    } else {
      await space!.close();
    }
  };

  const toggleEdgeReplication = async () => {
    await space?.internal.setEdgeReplicationPreference(
      space?.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED
        ? EdgeReplicationSetting.DISABLED
        : EdgeReplicationSetting.ENABLED,
    );
    setTimeout(() => forceUpdate({}), 500); // Refresh the panel.
  };

  const toolbar = useMemo(
    () => (
      <Toolbar.Root>
        {!props.space && <DataSpaceSelector />}
        <Toolbar.IconButton
          icon='ph--arrow-clockwise--regular'
          iconOnly
          label='Refresh'
          onClick={() => forceUpdate({})}
        />
        <div className='grow' />
        <Toolbar.Button onClick={toggleActive}>
          {space?.state.get() === SpaceState.SPACE_INACTIVE ? 'Open' : 'Close'}
        </Toolbar.Button>
        <Toolbar.Button onClick={toggleEdgeReplication}>
          {space?.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED
            ? 'Disable backup to EDGE'
            : 'Enable backup to EDGE'}
        </Toolbar.Button>
      </Toolbar.Root>
    ),
    [props.space, space?.state, space?.internal.data.edgeReplication],
  );

  return (
    <PanelContainer toolbar={toolbar}>
      {space && metadata && (
        <div>
          <SpaceProperties space={space} metadata={metadata} />
          <div className='bs-24'>
            <PipelineTable state={pipelineState ?? {}} metadata={metadata} onSelect={props.onSelectPipeline} />
          </div>
          <div className='bs-48'>
            <FeedTable onSelect={props.onSelectFeed} />
          </div>
          <div className='border-t border-separator'>
            <SyncStateInfo space={space} />
          </div>
        </div>
      )}
    </PanelContainer>
  );
};
