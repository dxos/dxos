//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Task } from '../../proto';
import { TileProps } from '../TileProps';
import { Root } from '../TileSlots';

export type TaskTileProps = TileProps<Task>;

export const TaskTile = ({ tile, slots = {} }: TaskTileProps) => {
  return <Root {...slots.root} label={<h2 {...slots.label}>{tile.title}</h2>}></Root>;
};

export const isTaskTile = (o: any): o is TaskTileProps => {
  return 'tile' in o && o.tile instanceof Task;
};

export const renderIfIsTaskTile = (o: any) => {
  if (isTaskTile(o)) {
    return <TaskTile {...o} />;
  } else {
    return null;
  }
};
