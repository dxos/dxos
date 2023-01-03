//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React from 'react';

import { Item, ObjectModel, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { Button, getSize, Loading } from '@dxos/react-uikit';

import { CheckboxItem, Input, List } from '../components';

export const TASK_LIST = 'dxos:type/task-list';
export const TASK_ITEM = 'dxos:type/task-list/item';

export type TaskList = Item<ObjectModel>;
export type TaskItem = Item<ObjectModel>;

export type TaskListProps = {
  space: Space;
  taskList: TaskItem;
};

export type TaskListItemProps = {
  task: TaskItem;
};

export const TaskListItem = (props: TaskListItemProps) => {
  const { task } = props;
  if (!task) {
    return null;
  }

  const text = task.model.get('title');
  const isChecked = task.model.get('checked');

  const deleteTask = async (item: TaskItem) => item.model.set('deletedAt', new Date());

  const setTaskTitle = async (item: TaskItem, title: string) => item.model.set('title', title);

  const setTaskChecked = async (item: TaskItem, checked: boolean) => item.model.set('checked', checked);

  return (
    <CheckboxItem
      {...{
        placeholder: 'type here',
        text,
        isChecked,
        onChecked: (value) => setTaskChecked(task, value),
        onTextChanged: (value) => setTaskTitle(task, value),
        onDeleteClicked: () => deleteTask(task),
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
  );
};

export const TaskList = (props: TaskListProps) => {
  const { taskList, space } = props;
  if (!taskList) {
    return <Loading label='Loading' />;
  }
  const title = taskList?.model.get('title') ?? '';
  const children = useSelection(taskList?.select().children().filter({ type: TASK_ITEM }));
  const visible = children?.filter((child) => !child?.model.get('deletedAt'));

  const setTaskListTitle = async (taskList: TaskList, title: string) => {
    void taskList.model.set('title', title);
  };

  const createTask = async (space: Space, taskList: TaskList) =>
    space?.database.createItem({
      model: ObjectModel,
      type: TASK_ITEM,
      parent: taskList.id
    });
  const empty = <div className='py-5 px-3 text-neutral-500'>There are no tasks to show</div>;
  return (
    <div role='none' className='my-5 py-2 px-6 bg-white dark:bg-neutral-700/50 rounded shadow'>
      <div>
        <Input
          className='text-xl'
          placeholder='Title this list ...'
          defaultValue={title}
          onBlur={(e) => setTaskListTitle(taskList, e.target.value)}
        />
      </div>
      <List empty={empty}>
        {(visible ?? [])?.map((task) => (
          <TaskListItem key={task.id} {...{ task }} />
        ))}
      </List>
      <div role='none' className='my-5'>
        <Button className='rounded-full p-3 border-none' onClick={() => createTask(space, taskList)}>
          <Plus className={getSize(5)} />
        </Button>
      </div>
    </div>
  );
};
