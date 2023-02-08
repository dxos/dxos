//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Space, useQuery, Document, withReactor } from '@dxos/react-client';

import { TaskList as TaskListComponent } from '../components/TaskList';

export type TaskListProps = {
  space: Space;
};

export const TaskList = withReactor((props: TaskListProps) => {
  const { space } = props;
  const [list] = useQuery(space, { type: 'list' });
  const { tasks, title } = list ?? {};
  list.tasks?.map((task: any) => task);
  return list ? (
    <TaskListComponent
      tasks={tasks ?? []}
      title={title}
      onTitleChanged={(title) => (list.title = title)}
      onTaskCompleteChanged={(task, completed) => {
        console.log(task, completed);
        task.completed = completed;
      }}
      onTaskTitleChanged={(task, title) => (task.title = title)}
      onTaskDeleted={(task) => space.experimental.db.delete(task as any as Document)}
      onTaskCreate={() => {
        list.tasks ||= [];
        list.tasks.push(
          new Document({
            type: 'task'
          })
        );
      }}
    />
  ) : null;
});
