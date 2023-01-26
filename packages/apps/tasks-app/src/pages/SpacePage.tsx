//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Space } from '@dxos/client';
import { useQuery, withReactor } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';

import { TaskListComponent } from '../components/TaskList';
import { Task, TaskList } from '../proto';

/**
 * Lay out a single task list per space.
 * @returns JSX
 */
export const SpacePage = withReactor(() => {
  const { space } = useOutletContext<{ space: Space }>();
  const [taskList] = useQuery(space, TaskList.filter());
  if (!taskList) {
    return <Loading label='loading' />;
  }
  console.log('space page render');
  return (
    <TaskListComponent
      taskList={taskList}
      onTitleChanged={(title) => {
        console.log('task list title', taskList);
        taskList.title = title;
      }}
      onTaskCreate={() => {
        console.log('create task');
        const task = new Task();
        taskList.tasks.push(task);
      }}
      onTaskTitleChanged={(task, title) => {
        console.log('change title', task);
        task.title = title;
      }}
      onTaskCompleteChanged={(task, completed) => {
        console.log('click', task, completed, 'was', task.completed);
        task.completed = completed;
      }}
      onTaskDeleted={(task) => {
        console.log('delete', task);
        void space.experimental.db.delete(task);
      }}
    />
  );
});
