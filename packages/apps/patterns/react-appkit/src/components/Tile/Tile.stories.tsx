//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { DocumentBase } from '@dxos/echo-schema';

import { Task as EchoTask, TaskList as EchoTaskList } from '../../proto';
import { BaseTile, DefaultTile, GenericTile, TaskTile, TaskListTile } from './Tile';

export default {
  component: BaseTile
} as any;

const props = {
  title: 'Example',
  description: 'This is an example card.'
};

export const Base = {
  args: {
    label: { children: props.title },
    children: props.description
  }
};

const example = new DocumentBase(props);

export const Default = {
  render: DefaultTile.render,
  args: { data: example }
};

const step1 = new EchoTask({ title: 'step 1', description: 'Build component', completed: true });

export const Task = {
  render: TaskTile.render,
  args: { data: step1 }
};

const taskList = new EchoTaskList({
  title: 'My Tasks',
  tasks: [step1, new EchoTask({ title: 'step 2' }), new EchoTask({ title: 'step 3' })]
});

export const TaskList = {
  render: TaskListTile.render,
  args: { data: taskList }
};

export const Generic = {
  render: (args: { data: any[] }) => (
    <>
      {args.data.map((data, index) => (
        <GenericTile key={index} data={data} />
      ))}
    </>
  ),
  args: {
    data: [step1, taskList, example]
  }
};
