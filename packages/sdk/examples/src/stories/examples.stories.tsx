//
// Copyright 2022 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Document } from '@braneframe/types';
import { ClientDecorator, setupPeersInSpace, ToggleNetworkDecorator } from '@dxos/react-client/testing';

import { EditorExample, TaskListExample } from '../examples';

export default {
  title: 'DXOS Examples',
};

const tasksList = await setupPeersInSpace({ count: 2 });

export const TaskList = {
  render: (args: { id: number }) => <TaskListExample {...args} spaceKey={tasksList.spaceKey} />,
  decorators: [ClientDecorator({ clients: tasksList.clients }), ToggleNetworkDecorator({ clients: tasksList.clients })],
};

const editor = await setupPeersInSpace({
  count: 2,
  onCreateSpace: (space) => {
    space.db.add(new Document());
  },
});

export const Editor = {
  render: (args: { id: number }) => <EditorExample {...args} spaceKey={editor.spaceKey} />,
  decorators: [ClientDecorator({ clients: editor.clients }), ToggleNetworkDecorator({ clients: editor.clients })],
};
