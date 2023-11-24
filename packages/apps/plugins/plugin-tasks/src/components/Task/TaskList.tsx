//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import React, { type KeyboardEvent, useEffect, useState } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { Input } from '@dxos/react-ui';

export type Task = {
  id: string;
  done?: boolean;
  title?: string;
  text?: TextObject;
  subtasks?: Task[];
};

type ItemProps = {
  task: Task;
  focus?: boolean;
  spellCheck?: boolean;
  onEnter?: () => void;
  onDelete?: () => void;
  onIndent?: (left?: boolean) => void;
};

const Item = ({ task, focus, spellCheck = false, onEnter, onDelete, onIndent }: ItemProps) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        onIndent?.(event.shiftKey);
        break;
      case 'Enter':
        // TODO(burdon): Insert above if at start of line (or split).
        onEnter?.();
        break;
      case 'Backspace':
        // TODO(burdon): Merge with previous if at start of line.
        if (task.title?.length === 0) {
          onDelete?.();
        }
        break;
      case 'Escape':
        // TODO(burdon): Toggle checkbox?
        break;
    }
  };

  return (
    <div className='flex items-center px-2 gap-3'>
      <Input.Root>
        <Input.Checkbox
          checked={task.done}
          onCheckedChange={(checked) => {
            task.done = !!checked;
          }}
        />
      </Input.Root>
      {/* TODO(burdon): Placeholder if focused. */}
      <Input.Root>
        <Input.TextInput
          autoFocus={focus}
          autoComplete='off'
          spellCheck={spellCheck}
          classNames='w-full'
          variant='subdued'
          value={task.title ?? ''}
          onChange={({ target: { value } }) => {
            task.title = value;
          }}
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
    </div>
  );
};

type ListProps = {
  parent?: Task;
  tasks?: Task[];
  onCreate?: (parent: Task | undefined, index?: number) => Task;
  onDelete?: (parent: Task | undefined, task: Task) => void;
  onIndent?: (parent: Task | undefined, task: Task, left?: boolean) => void;
};

const List = ({ parent, tasks = [], onCreate, onDelete, onIndent }: ListProps) => {
  const [active, setActive] = useState<string>();
  useEffect(() => {
    setActive(undefined);
  }, [active]);

  const handleCreate = (id: string) => {
    const idx = tasks.findIndex((task) => task.id === id);
    const created = onCreate?.(undefined, idx + 1);
    if (created) {
      setActive(created.id);
    }
  };

  return (
    <div className='flex flex-col w-full'>
      {tasks?.map((task) => (
        <div key={task.id} className='w-full'>
          <Item
            task={task}
            focus={active === task.id}
            onEnter={() => handleCreate(task.id)}
            onDelete={() => onDelete?.(parent, task)}
            onIndent={(left) => onIndent?.(parent, task, left)}
          />
          {(task.subtasks?.length ?? 0) > 0 && (
            // TODO(burdon): Indent based on density.
            <div className='pl-4'>
              <List
                parent={task}
                tasks={task.subtasks}
                onCreate={onCreate ? (_, idx) => onCreate?.(task, idx) : undefined}
                onDelete={onDelete}
                onIndent={onIndent}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

type RootProps = {
  tasks?: Task[];
  onCreate?: () => Task;
};

const Root = ({ tasks = [], onCreate }: RootProps) => {
  const domAttributes = useArrowNavigationGroup({ axis: 'grid' });

  const getParent = (tasks: Task[], task: Task): Task | undefined => {
    const ancestor = tasks.find(({ id }) => id === task.id);
    if (ancestor) {
      return ancestor;
    }

    for (const subTask of tasks) {
      if (subTask.subtasks) {
        const ancestor = getParent(subTask.subtasks, task);
        if (ancestor) {
          return ancestor;
        }
      }
    }
  };

  const getSubTasks = (parent: Task | undefined): Task[] => {
    if (parent) {
      return (parent.subtasks ??= []);
    } else {
      return tasks;
    }
  };

  // TODO(burdon): Add to first child if exists.
  const handleCreate = (parent: Task | undefined, index?: number) => {
    const task = onCreate!();
    const tasks = getSubTasks(parent);
    tasks.splice(index ?? tasks.length, 0, task);
    return task;
  };

  const handleDelete = (parent: Task | undefined, task: Task) => {
    const tasks = getSubTasks(parent);
    const index = tasks.findIndex(({ id }) => id === task.id);
    tasks.splice(index ?? tasks.length, 1);
  };

  const handleIndent = (parent: Task | undefined, task: Task, left?: boolean) => {
    const subTasks = getSubTasks(parent);
    const idx = subTasks.findIndex(({ id }) => id === task.id) ?? -1;
    if (left) {
      if (parent?.subtasks) {
        const ancestor = getParent(tasks, parent);
        console.log('##', ancestor?.id, parent.id);
      }
    } else {
      if (idx > 0) {
        subTasks.splice(idx, 1);
        const newTasks = getSubTasks(subTasks[idx - 1]);
        newTasks.push(task);
      }
    }
  };

  return (
    <div className='w-full' {...domAttributes}>
      <List tasks={tasks} onCreate={onCreate && handleCreate} onDelete={handleDelete} onIndent={handleIndent} />
    </div>
  );
};

export const TaskList = {
  Root,
  List,
  Item,
};
