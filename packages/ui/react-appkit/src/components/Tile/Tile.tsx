//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type TypedObject } from '@dxos/react-client/echo';

import { Task, TaskList } from '../../proto';
import { Group } from '../Group';

export type Tile<T = TypedObject> = {
  canRender: (data: TypedObject) => boolean;
  render: (props: { data: T }) => JSX.Element;
};

export const BaseTile = Group;

export const DefaultTile: Tile<TypedObject> = {
  canRender: (_data) => true,
  render: ({ data }) => (
    <BaseTile label={{ children: data ? data.title : 'Unknown object' }}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </BaseTile>
  ),
};

export const TaskListTile: Tile<TaskList> = {
  // TODO(wittjosiah): Ideally the type string would be exported from the schema as a constant.
  // TODO(wittjosiah): `data instanceof TaskList` should work
  canRender: (data) => data.__typename === TaskList.schema.typename,
  render: ({ data }) => (
    <BaseTile label={{ children: data.title }}>
      <ul>
        {data.tasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    </BaseTile>
  ),
};

export const TaskTile: Tile<Task> = {
  canRender: (data) => data.__typename === Task.schema.typename,
  render: ({ data }) => (
    <BaseTile
      label={{
        children: (
          <>
            <input type='checkbox' checked={data.completed} className='mr-2' disabled />
            {data.title}
          </>
        ),
      }}
    >
      {data.description}
    </BaseTile>
  ),
};

export const ALL_CARDS = [
  TaskListTile,
  TaskTile,
  // NOTE: Must be last.
  DefaultTile,
];

export const GenericTile: Tile<TypedObject>['render'] = ({ data }) => {
  const card = ALL_CARDS.find((card) => card.canRender(data));

  // TODO(wittjosiah): Infer type of data from `canRender`?
  return card!.render({ data: data as any });
};
