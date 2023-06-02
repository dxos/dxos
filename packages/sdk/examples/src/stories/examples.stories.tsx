//
// Copyright 2022 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { ClientDecorator, setupPeersInSpace, ToggleNetworkDecorator } from '@dxos/react-client/testing';

import { TaskListExample } from '../examples';

export default {
  title: 'DXOS Examples',
};

const { spaceKey, clients } = await setupPeersInSpace({ count: 2 });

export const TaskList = {
  render: (args: { id: number }) => <TaskListExample {...args} spaceKey={spaceKey} />,
  decorators: [ClientDecorator({ clients }), ToggleNetworkDecorator({ clients })],
};
