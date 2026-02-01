//
// Copyright 2023 DXOS.org
//

import { Registry, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type KanbanModel } from '../model';
import { type TaskItem, createKanbanModel, createTaskItem } from '../testing';

import { Kanban as KanbanComponent } from './Kanban';

type StoryProps = {};

const DefaultStory = (_: StoryProps) => {
  const [state, setState] = useState<{ model: KanbanModel<TaskItem>; registry: Registry.Registry }>();

  useEffect(() => {
    const init = async () => {
      const registry = Registry.make();
      const model = createKanbanModel(registry);

      await model.open();
      model.setItems([
        createTaskItem('Task 1', 'todo'),
        createTaskItem('Task 2', 'in-progress'),
        createTaskItem('Task 3', 'in-progress'),
        createTaskItem('Task 4', 'in-progress'),
        createTaskItem('Task 5', 'done'),
      ]);

      setState({ model, registry });
    };

    void init();

    return () => {
      console.log('Story effect cleanup running');
    };
  }, []);

  if (!state) {
    return <></>;
  }

  return (
    <RegistryContext.Provider value={state.registry}>
      <KanbanComponent model={state.model} />
    </RegistryContext.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-kanban/Kanban',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'fullscreen' }),
    // withClientProvider({
    //   types: [],
    //   createIdentity: true,
    //   createSpace: true,
    //   onCreateSpace: ({ space }, context) => {},
    // }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
