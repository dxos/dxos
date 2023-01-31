//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Space, useQuery, Document } from '@dxos/react-client';

import { TaskList as TaskListComponent } from '../components/TaskList';

export type TaskListProps = {
  space: Space;
};
export const TaskList = (props: TaskListProps) => {
  const { space } = props;
  const [listItem] = useQuery(space, { type: 'list' });
  const { tasks, title } = listItem ?? {};
  return listItem ? (
    <TaskListComponent
      tasks={tasks ?? []}
      title={title}
      onTaskCreate={() => {
        listItem.tasks ||= [];
        listItem.tasks.push(
          new Document({
            type: 'task'
          })
        );
      }}
    />
  ) : null;
};
