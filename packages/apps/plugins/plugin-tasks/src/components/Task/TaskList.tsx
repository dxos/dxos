//
// Copyright 2023 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { Circle, DotsThreeVertical, X } from '@phosphor-icons/react';
import React, { type HTMLAttributes, type KeyboardEvent, useState } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { Button, DropdownMenu, Input } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

// TODO(burdon): Adapt from Tree (incl. drag/drop).

export type Task = {
  id: string;
  done?: boolean;
  title?: string;
  text?: TextObject;
  subtasks?: Task[];
};

//
// Item
//

type ItemProps = Pick<HTMLAttributes<HTMLDivElement>, 'placeholder' | 'spellCheck'> & {
  task: Task;
  active?: boolean;
  showCheckbox?: boolean;
  onFocus?: () => void;
  onEnter?: () => void;
  onDelete?: () => void;
  onIndent?: (left?: boolean) => void;
};

const Item = ({
  task,
  active,
  showCheckbox,
  placeholder,
  spellCheck = false,
  onFocus,
  onEnter,
  onDelete,
  onIndent,
}: ItemProps) => {
  const [focused, setFocused] = useState(false);

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
      {(showCheckbox && (
        <Input.Root>
          <Input.Checkbox
            checked={task.done}
            onCheckedChange={(checked) => {
              task.done = !!checked;
            }}
          />
        </Input.Root>
      )) || (
        <div className='shrink-0'>
          <Circle weight={active ? 'duotone' : undefined} className={mx(getSize(2), active && 'text-primary-500')} />
        </div>
      )}
      {/* TODO(burdon): Show placeholder if active. */}
      <Input.Root>
        <Input.TextInput
          autoFocus={active}
          autoComplete='off'
          spellCheck={spellCheck}
          placeholder={focused ? placeholder : undefined}
          classNames='w-full'
          variant='subdued'
          value={task.title ?? ''}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          onChange={({ target: { value } }) => {
            task.title = value;
          }}
        />
      </Input.Root>
      {active && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant='ghost'>
              <DotsThreeVertical />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Viewport>
                {onDelete && (
                  <DropdownMenu.Item onClick={onDelete}>
                    <X className={getSize(5)} />
                    <p>Delete item</p>
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
};

//
// List
//

// TODO(burdon): Pass in Task (simplifies callbacks).
type ListProps = {
  parent?: Task;
  tasks?: Task[];
  active?: string;
  onFocus?: (task: Task) => void;
  onCreate?: (parent: Task | undefined, task: Task, after?: boolean) => Task;
  onDelete?: (parent: Task | undefined, task: Task) => void;
  onIndent?: (parent: Task | undefined, task: Task, left?: boolean) => void;
};

const List = ({ parent, tasks = [], active, onFocus, onCreate, onDelete, onIndent }: ListProps) => {
  const handleCreate = (task: Task) => {
    onCreate?.(parent, task);
  };

  return (
    <div className='flex flex-col w-full'>
      {tasks?.map((task) => (
        <div key={task.id} className='w-full'>
          <Item
            task={task}
            active={active === task.id}
            placeholder='Enter text'
            onFocus={() => onFocus?.(task)}
            onEnter={() => handleCreate(task)}
            onDelete={() => onDelete?.(parent, task)}
            onIndent={(left) => onIndent?.(parent, task, left)}
          />
          {(task.subtasks?.length ?? 0) > 0 && (
            // TODO(burdon): Indent based on density.
            <div className='pl-4'>
              <List
                active={active}
                parent={task}
                tasks={task.subtasks}
                onFocus={onFocus}
                onCreate={onCreate}
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

//
// Root
//

type RootProps = {
  tasks?: Task[];
  onCreate?: () => Task;
};

const Root = ({ tasks = [], onCreate }: RootProps) => {
  const domAttributes = useArrowNavigationGroup({ axis: 'grid' });
  const [active, setActive] = useState<string>();

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

  const handleCreate = (parent: Task | undefined, current: Task, before?: boolean) => {
    const task = onCreate!();
    const tasks = getSubTasks(parent);
    const idx = tasks.findIndex(({ id }) => current.id === id);
    if (before) {
      tasks.splice(idx, 0, task);
    } else {
      if (current.subtasks?.length) {
        current.subtasks.splice(0, 0, task);
      } else {
        tasks.splice(idx + 1, 0, task);
      }
    }

    setActive(task.id);
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
      <List
        tasks={tasks}
        active={active}
        onFocus={(task) => setActive(task.id)}
        onCreate={onCreate && handleCreate}
        onDelete={handleDelete}
        onIndent={handleIndent}
      />
    </div>
  );
};

export const TaskList = {
  Root,
  List,
  Item,
};
