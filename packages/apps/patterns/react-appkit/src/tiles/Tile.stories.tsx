//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { DocumentBase } from '@dxos/echo-schema';

import { Task as EchoTask, TaskList as EchoTaskList } from '../proto';
import { FallbackTile, AnyTile, TaskTile, TaskListTile } from './';

export default {
  component: FallbackTile
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
  render: FallbackTile,
  args: { tile: example }
};

const step1 = new EchoTask({ title: 'step 1', description: 'Build component', completed: true });

export const Task = {
  render: TaskTile,
  args: { tile: step1 }
};

const taskList = new EchoTaskList({
  title: 'My Tasks',
  tasks: [step1, new EchoTask({ title: 'step 2' }), new EchoTask({ title: 'step 3' })]
});

export const TaskList = {
  render: TaskListTile,
  args: { tile: taskList }
};

export const Generic = {
  render: (args: { tiles: any[] }) => (
    <>
      {args.tiles.map((tile, index) => (
        <AnyTile key={index} tile={tile} />
      ))}
    </>
  ),
  args: {
    tiles: [step1, taskList, example]
  }
};
