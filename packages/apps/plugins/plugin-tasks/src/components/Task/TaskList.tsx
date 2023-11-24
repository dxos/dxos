//
// Copyright 2023 DXOS.org
//

import { Circle, DotsThreeVertical, X } from '@phosphor-icons/react';
import React, { type HTMLAttributes, type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Button, DropdownMenu, Input } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { getNext, getParent, getPrevious, getSubTasks, type Task } from './types';

// TODO(burdon): Adapt from Tree (incl. drag/drop)?

//
// Item
//

type ItemProps = Pick<HTMLAttributes<HTMLDivElement>, 'placeholder' | 'spellCheck'> & {
  task: Task;
  active?: boolean;
  showCheckbox?: boolean;
  onFocus?: () => void;
  onEnter?: (before?: boolean) => void;
  onDelete?: () => void;
  onIndent?: (left?: boolean) => void;
  onNav?: (task: Task, direction?: 'home' | 'end' | 'up' | 'down') => void;
};

const Item = ({
  task,
  active,
  showCheckbox = true,
  placeholder,
  spellCheck = false,
  onFocus,
  onEnter,
  onDelete,
  onIndent,
  onNav,
}: ItemProps) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
    }
  }, [active]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowUp':
        onNav?.(task, event.shiftKey ? 'home' : 'up');
        break;
      case 'ArrowDown':
        onNav?.(task, event.shiftKey ? 'end' : 'down');
        break;
      case 'Tab':
        event.preventDefault();
        onIndent?.(event.shiftKey);
        break;
      case 'Enter':
        onEnter?.(!!task.title?.length && inputRef.current?.selectionStart === 0);
        break;
      case 'Backspace':
        // TODO(burdon): Merge with previous if caret at start.
        if (!task.title?.length) {
          event.preventDefault();
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
          <Circle weight={active ? 'fill' : undefined} className={mx(getSize(2), active && 'text-primary-500')} />
        </div>
      )}
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          // autoFocus={active}
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

type ListProps = {
  root: Task;
  active?: string;
  onFocus?: (task: Task) => void;
  onCreate?: (parent: Task, task: Task, after?: boolean) => Task;
  onDelete?: (parent: Task, task: Task) => void;
  onIndent?: (parent: Task, task: Task, left?: boolean) => void;
} & Pick<ItemProps, 'onNav'>;

const List = ({ root, active, onFocus, onCreate, onDelete, onIndent, onNav }: ListProps) => {
  return (
    <div className='flex flex-col w-full'>
      {root.subTasks?.map((task) => (
        <div key={task.id} className='w-full'>
          <Item
            task={task}
            active={active === task.id}
            placeholder='Enter text'
            onFocus={() => onFocus?.(task)}
            onEnter={(before) => onCreate?.(root, task, before)}
            onDelete={() => onDelete?.(root, task)}
            onIndent={(left) => onIndent?.(root, task, left)}
            onNav={onNav}
          />
          {(task.subTasks?.length ?? 0) > 0 && (
            // TODO(burdon): Indent based on density.
            <div className='pl-4'>
              <List
                root={task}
                active={active}
                onFocus={onFocus}
                onCreate={onCreate}
                onDelete={onDelete}
                onIndent={onIndent}
                onNav={onNav}
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
  root: Task;
  onCreate?: () => Task;
};

const Root = ({ root, onCreate }: RootProps) => {
  const [active, setActive] = useState<string>();

  const handleCreate: ListProps['onCreate'] = (parent, current, before) => {
    const task = onCreate!();
    const tasks = getSubTasks(parent);
    const idx = tasks.findIndex(({ id }) => current.id === id);
    if (before) {
      tasks.splice(idx, 0, task);
    } else {
      if (current.subTasks?.length) {
        current.subTasks.splice(0, 0, task);
      } else {
        tasks.splice(idx + 1, 0, task);
      }
    }

    setActive(task.id);
    return task;
  };

  const handleDelete: ListProps['onDelete'] = (parent, task) => {
    const tasks = getSubTasks(parent);
    if (parent || tasks.length > 1) {
      const idx = tasks.findIndex(({ id }) => id === task.id);
      tasks.splice(idx, 1);
      if (idx - 1 >= 0) {
        // TODO(burdon): Select last child of previous.
        setActive(tasks[idx - 1].id);
      } else {
        if (parent) {
          setActive(parent.id);
        }
      }
    }
  };

  const handleIndent: ListProps['onIndent'] = (parent, task, left) => {
    const subTasks = getSubTasks(parent);
    const idx = subTasks.findIndex(({ id }) => id === task.id) ?? -1;
    if (left) {
      if (parent) {
        // Move all siblings.
        const move = subTasks.splice(idx, subTasks.length - idx);

        // Get parent's parent.
        const ancestor = getParent(root, parent);
        if (ancestor) {
          const ancestorSubTasks = getSubTasks(ancestor);
          const parentIdx = ancestorSubTasks.findIndex(({ id }) => id === parent.id);
          ancestorSubTasks.splice(parentIdx + 1, 0, ...move);
        }
      }
    } else {
      // Can't indent first child.
      if (idx > 0) {
        subTasks.splice(idx, 1);
        const newTasks = getSubTasks(subTasks[idx - 1]);
        newTasks.push(task);
      }
    }
  };

  // TODO(burdon): Preserve caret position.
  const handleNav: ListProps['onNav'] = (task, direction) => {
    switch (direction) {
      case 'home':
        // TODO(burdon): Go to first child of group.
        setActive(root.subTasks![0].id);
        break;
      case 'end':
        // TODO(burdon): Go to last child of group.
        setActive(root.subTasks![root.subTasks!.length - 1].id);
        break;
      case 'up':
        {
          const previous = getPrevious(root, task);
          if (previous) {
            setActive(previous.id);
          }
        }
        break;
      case 'down':
        {
          const next = getNext(root, task);
          if (next) {
            setActive(next.id);
          }
        }
        break;
    }
  };

  return (
    <div className='w-full'>
      <List
        root={root}
        active={active}
        onFocus={(task) => setActive(task.id)}
        onCreate={onCreate && handleCreate}
        onDelete={handleDelete}
        onIndent={handleIndent}
        onNav={handleNav}
      />
    </div>
  );
};

export const TaskList = {
  Root,
  List,
  Item,
};
