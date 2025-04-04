//
// Copyright 2024 DXOS.org
//

import React, { useCallback, type ComponentProps } from 'react';

import { Surface, useCapabilities, useCapability } from '@dxos/app-framework';
import { type NodeArg } from '@dxos/plugin-graph';
import { type ChannelType } from '@dxos/plugin-space/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { createEditorActionGroup } from '@dxos/react-ui-editor';
import {
  createMenuAction,
  MenuProvider,
  ToolbarMenu,
  type ToolbarMenuActionGroupProperties,
  useMenuActions,
  type MenuAction,
} from '@dxos/react-ui-menu';
import { StackItem } from '@dxos/react-ui-stack';

import { ChatContainer } from './ChatContainer';
import { ThreadCapabilities } from '../capabilities';

const useActivitiesMenu = (activities: ThreadCapabilities.Activity[], activity: string | undefined) => {
  return useMenuActions(() => ({
    nodes: [
      createEditorActionGroup('activities', {
        variant: 'toggleGroup',
        selectCardinality: 'single',
        value: activity,
      } as ToolbarMenuActionGroupProperties) as NodeArg<any>,
      ...activities.map(({ id, ...properties }) =>
        createMenuAction(id, {
          ...properties,
          checked: true,
        }),
      ),
    ],
    edges: [
      { source: 'root', target: 'activities' },
      ...activities.map((activity) => ({ source: 'activities', target: activity.id })),
    ],
  }));
};

const ChannelContainer = ({
  role,
  channel,
  context,
}: Pick<ComponentProps<typeof ChatContainer>, 'context'> & { channel: ChannelType; role: string }) => {
  const { state } = useCapability(ThreadCapabilities.MutableState);
  const currentActivity = state.activities[channel.id];
  const activities = useCapabilities(ThreadCapabilities.Activity);
  const menu = useActivitiesMenu(activities, currentActivity);
  const handleAction = useCallback(
    (action: MenuAction) => (state.activities[channel.id] = currentActivity === action.id ? undefined : action.id),
    [currentActivity],
  );

  const space = getSpace(channel);
  if (!space) {
    return null;
  }

  return (
    <StackItem.Content toolbar>
      <MenuProvider {...menu} onAction={handleAction} attendableId={fullyQualifiedId(channel)}>
        <ToolbarMenu />
      </MenuProvider>
      {currentActivity ? (
        <Surface role={`channel-activity--${currentActivity}`} data={{ subject: channel }} />
      ) : (
        <ChatContainer space={space} dxn={channel.queue.dxn} context={context} />
      )}
    </StackItem.Content>
  );
};

export default ChannelContainer;
