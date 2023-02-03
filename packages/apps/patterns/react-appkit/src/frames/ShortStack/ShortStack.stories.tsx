//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Task as EchoTask, TaskList as EchoTaskList } from '../../proto';
import { ShortStack } from './ShortStack';

export default {
  component: ShortStack
} as any;

const tasksAndLists = [
  new EchoTask({ title: 'step 1', description: 'Plan thing', completed: true }),
  new EchoTask({ title: 'step 2', description: 'Design thing', completed: true }),
  new EchoTaskList({
    title: 'step 3',
    description: 'Build thing',
    tasks: [
      new EchoTask({ title: 'step 3.1', description: 'Prototype the thing', completed: true }),
      new EchoTask({ title: 'step 3.2', description: 'Code to production standards', completed: false })
    ]
  }),
  new EchoTask({ title: 'step 4', description: 'Test thing', completed: false }),
  new EchoTask({ title: 'step 5', description: '…profit?', completed: false })
];

export const Task = {
  render: ShortStack,
  args: { type: 'shortStack', tiles: tasksAndLists.map((item) => ({ tile: item })) }
};
