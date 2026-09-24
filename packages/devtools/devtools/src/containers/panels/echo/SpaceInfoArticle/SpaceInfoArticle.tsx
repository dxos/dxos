//
// Copyright 2020 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import React, { type FC, useMemo, useState } from 'react';

import { MulticastObservable } from '@dxos/async';
import { toPublicKey } from '@dxos/protocols/buf';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { Space_PipelineStateSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { type Space } from '@dxos/react-client/echo';
import { useMulticastObservable } from '@dxos/react-hooks';
import { Panel, ScrollArea, Toolbar } from '@dxos/react-ui';

import { DataSpaceSelector } from '../../../../containers/index.ts';
import { useDevtoolsState, useSpacesInfo } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';
import { DatabaseStatsInfo } from './DatabaseStatsInfo.tsx';
import { FeedTable, type FeedTableProps } from './FeedTable.tsx';
import { PipelineTable, type PipelineTableProps } from './PipelineTable.tsx';
import { SpaceProperties } from './SpaceProperties.tsx';
import { SyncStateInfo } from './SyncStateInfo.tsx';

export type SpaceInfoArticleProps = ArticleProps & {
  space?: Space;
  onSelectFeed?: FeedTableProps['onSelect'];
  onSelectPipeline?: PipelineTableProps['onSelect'];
};

export const SpaceInfoArticle: FC<SpaceInfoArticleProps> = ({ role, ...props }) => {
  const [, forceUpdate] = useState({});
  const state = useDevtoolsState();
  const space = props.space ?? state.space;

  // TODO(dmaretskyi): We don't need SpaceInfo anymore?
  const spacesInfo = useSpacesInfo();
  const metadata = space?.key && spacesInfo.find((info) => toPublicKey(info.key)?.equals(space?.key));
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
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>{toolbar}</Panel.Toolbar>
      <Panel.Content>
        {space && metadata && (
          <ScrollArea.Root thin>
            <ScrollArea.Viewport>
              <SpaceProperties space={space} metadata={metadata} />
              <div className='h-24'>
                <PipelineTable
                  state={pipelineState ?? create(Space_PipelineStateSchema)}
                  metadata={metadata}
                  onSelect={props.onSelectPipeline}
                />
              </div>
              <div className='h-48'>
                <FeedTable onSelect={props.onSelectFeed} />
              </div>
              <div className='border-t border-separator'>
                <SyncStateInfo space={space} />
              </div>
              <div className='border-t border-separator'>
                <DatabaseStatsInfo space={space} />
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
