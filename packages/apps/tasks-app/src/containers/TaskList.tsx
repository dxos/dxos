import React, { useCallback } from 'react';
import { Item, ObjectModel, Space } from '@dxos/client';
import { List } from '../components/List';
import { useSelection } from '@dxos/react-client';
import { CheckboxItem, CheckBoxItemProps } from '../components/CheckboxItem';
import { Button, getSize, useTranslation, Input } from '@dxos/react-uikit';
import { Minus, Plus } from 'phosphor-react';

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
  const { t } = useTranslation();
  const { task } = props;
  const text = task.model.get('title');
  const isChecked = task.model.get('checked');

  const deleteTask = async (item: TaskItem) => item.model.set('deletedAt', new Date());

  const setTaskTitle = async (item: TaskItem, title: string) => item.model.set('title', title);

  const setTaskChecked = async (item: TaskItem, checked: boolean) => item.model.set('checked', checked);

  return (
    <CheckboxItem
      {...{
        placeholder: t('list item title placeholder'),
        text,
        isChecked,
        onChecked: (value) => setTaskChecked(task, value),
        onTextChanged: (value) => setTaskTitle(task, value)
      }}
    />
  );
};

export const TaskList = (props: TaskListProps) => {
  const { t } = useTranslation('appkit');
  const { taskList: taskList, space } = props;
  const title = taskList.model.get('title');
  const children = useSelection(taskList?.select().children().filter({ type: TASK_ITEM }));
  const visible = children?.filter((child) => !child.model.get('deletedAt'));

  const setTaskListTitle = async (taskList: TaskList, title: string) => taskList.model.set('title', title);

  const createTask = async (space: Space, taskList: TaskList) =>
    space?.database.createItem({
      model: ObjectModel,
      type: TASK_ITEM,
      parent: taskList.id
    });

  return (
    <div>
      <div>
        <Input
          label={t('list title label')}
          placeholder={t('list title placeholder')}
          labelVisuallyHidden
          initialValue={title}
          onChange={(value) => setTaskListTitle(taskList, value)}
        />
      </div>
      <List>
        {(visible ?? [])?.map((task) => (
          <TaskListItem key={task.id} {...{ task }} />
        ))}
      </List>
      <div role='none'>
        <Button className='is-full' onClick={() => createTask(space, taskList)}>
          <Plus className={getSize(5)} />
          <span className='sr-only'>{t('add list item label')}</span>
        </Button>
      </div>
    </div>
  );
};
