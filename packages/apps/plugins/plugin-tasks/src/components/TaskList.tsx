//
// Copyright 2023 DXOS.org
//

import { useSpaces } from '@dxos/react-client/dist/types/src/echo';
import React, { type FC, useEffect, useState } from 'react';

import { type Task, TaskItem } from './TaskItem';

export type TaskListComponentProps = {
  tasks?: Task[];
  onCreate?: (parent?: Task, index?: number) => Task;
};

export const TaskListComponent: FC<TaskListComponentProps> = ({ tasks = [], onCreate }) => {
  const [active, setActive] = useState<string>();
  useEffect(() => {
    setActive(undefined);
  }, [active]);

  const handleCreate = (id: string) => {
    const idx = tasks.findIndex(task => task.id === id);
    const created = onCreate?.(undefined, idx + 1);
    if (created) {
      setActive(created.id);
    }
  };

  return (
    <div className='flex flex-col'>
      {tasks?.map((task) => (
        <div key={task.id}>
          <TaskItem task={task} onEnter={() => handleCreate(task.id)} foucs={active === task.id} />
          {task.subtasks?.length && (
            // TODO(burdon): Indent based on density.
            <div className='pl-6'>
              <TaskListComponent
                tasks={task.subtasks}
                onCreate={onCreate ? (_, idx) => onCreate?.(task, idx) : undefined}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
