//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Task as EchoTask, TaskList as EchoTaskList } from '../../proto';
import { BaseCard, DefaultCard, TaskCard, TaskListCard } from './Card';

export default {
  component: BaseCard
} as any;

export const Base = {
  args: {
    label: { children: 'Example' },
    children: 'This is an example card.'
  }
};

export const Default = {
  render: DefaultCard.render,
  args: {
    data: {
      title: 'Example',
      children: 'This is an example card.'
    }
  }
};

export const TaskList = {
  render: TaskListCard.render,
  args: {
    data: new EchoTaskList({
      title: 'My Tasks',
      tasks: [new EchoTask({ title: 'step 1' }), new EchoTask({ title: 'step 2' }), new EchoTask({ title: 'step 3' })]
    })
  }
};

export const Task = {
  render: TaskCard.render,
  args: {
    data: new EchoTask({ title: 'step 1', description: 'Build component', completed: true })
  }
};
