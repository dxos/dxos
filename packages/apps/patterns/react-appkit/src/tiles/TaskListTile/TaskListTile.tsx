//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { id } from '@dxos/echo-schema';

import { TaskList } from '../../proto';
import { TileProps } from '../TileProps';
import { Root } from '../TileSlots';

export type TaskListTileProps = TileProps<TaskList>;

export const TaskListTile = ({ tile }: TaskListTileProps) => {
  return (
    <Root label={<h2>{tile.title}</h2>}>
      <ul>
        {tile.tasks.map((task) => (
          <li key={task[id]}>{task.title}</li>
        ))}
      </ul>
    </Root>
  );
};

export const isTaskListTile = (o: any): o is TaskListTileProps => {
  return 'tile' in o && o.tile instanceof TaskList;
};

export const renderIfTaskListTile = (o: any) => {
  if (isTaskListTile(o)) {
    return <TaskListTile {...o} />;
  } else {
    return null;
  }
};
