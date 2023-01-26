//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React from 'react';
import { useOutletContext } from 'react-router-dom';

import { Space } from '@dxos/client';
import { deleted, id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { Button, getSize, Loading } from '@dxos/react-components';

import { CheckboxItem, Input, List } from '.';
import { TaskList, Task } from '../proto';

export type TaskListProps = {
  taskList: TaskList;
  onTitleChanged?: (title: string) => any;
  onTaskCreate?: () => any;
  onTaskTitleChanged?: (task: Task, title: string) => any;
  onTaskCompleteChanged?: (task: Task, completed: boolean) => any;
  onTaskDeleted?: (task: Task) => any;
};

export const TaskListComponent = withReactor((props: TaskListProps) => {
  const { taskList, onTitleChanged, onTaskCreate, onTaskTitleChanged, onTaskCompleteChanged, onTaskDeleted } = props;
  if (!taskList) {
    return <Loading label='Loading' />;
  }
  const empty = <div className='py-5 px-3 text-neutral-500'>There are no tasks to show</div>;
  return (
    <div role='none' className='my-5 py-2 px-6 bg-white dark:bg-neutral-700/50 rounded shadow'>
      <div>
        <Input
          className='text-xl'
          placeholder='Title this list ...'
          defaultValue={taskList.title ?? ''}
          onBlur={(e) => onTitleChanged?.(e.target.value)}
        />
      </div>
      <List empty={empty}>
        {(taskList.tasks ?? [])
          ?.filter((task) => !task[deleted])
          .map((task) => (
            <CheckboxItem
              key={task[id]}
              {...{
                placeholder: 'type here',
                text: task.title,
                isChecked: task.completed,
                onChecked: (completed) => onTaskCompleteChanged?.(task, completed),
                onTextChanged: (title) => onTaskTitleChanged?.(task, title),
                onDeleteClicked: () => onTaskDeleted?.(task),
                onInputKeyUp: (e) => {
                  if (e.key === 'Enter') {
                    // TODO: go to next item or create new
                  } else if (e.key === 'Up') {
                    // TODO: go up one item
                  } else if (e.key === 'Down') {
                    // TODO: go to next item or create new
                  }
                }
              }}
            />
          ))}
      </List>
      <div role='none' className='my-5'>
        <Button className='rounded-full p-3 border-none' onClick={() => onTaskCreate?.()}>
          <Plus className={getSize(5)} />
        </Button>
      </div>
    </div>
  );
});
