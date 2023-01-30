//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DocumentBase, id, type } from '@dxos/echo-schema';
import { Group } from '@dxos/react-components';

import { Task, TaskList } from '../../proto';

export type Card<T = any> = {
  canRender: (data: DocumentBase) => boolean;
  render: (props: { data: T }) => JSX.Element;
};

export const BaseCard = Group;

export const DefaultCard: Card = {
  canRender: (_data) => true,
  render: ({ data }) => (
    <BaseCard label={{ children: data ? data.title : 'Unknown object' }}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </BaseCard>
  )
};

export const TaskListCard: Card<TaskList> = {
  // TODO(wittjosiah): Ideally the type string would be exported from the schema as a constant.
  canRender: (data) => data[type] === new TaskList()[type],
  render: ({ data }) => (
    <BaseCard label={{ children: data.title }}>
      <ul>
        {data.tasks.map((task) => (
          <li key={task[id]}>{task.title}</li>
        ))}
      </ul>
    </BaseCard>
  )
};

export const TaskCard: Card<Task> = {
  canRender: (data) => data[type] === new Task()[type],
  render: ({ data }) => (
    <BaseCard
      label={{
        children: (
          <>
            <input type='checkbox' checked={data.completed} className='mr-2' disabled />
            {data.title}
          </>
        )
      }}
    >
      {data.description}
    </BaseCard>
  )
};

export const ALL_CARDS = [
  TaskListCard,
  TaskCard,
  // NOTE: Must be last.
  DefaultCard
];

export const GenericCard: Card['render'] = ({ data }) => {
  const card = ALL_CARDS.find((card) => card.canRender(data));

  return card!.render({ data });
};
