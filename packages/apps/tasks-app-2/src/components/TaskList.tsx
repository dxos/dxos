//
// Copyright 2022 DXOS.org
//

import { Plus } from 'phosphor-react';
import React, { useRef, useEffect } from 'react';


import { Button, getSize, Loading } from '@dxos/react-components';

import { CheckboxItem } from './CheckboxItem';
import { Input } from './Input';
import { List } from './List';

export type TaskListProps<T extends Task = Task> = {
  title: string;
  tasks: T[];
  onTitleChanged?: (title: string) => any;
  onTaskCreate?: () => any;
  onTaskTitleChanged?: (task: T, title: string) => any;
  onTaskCompleteChanged?: (task: T, completed: boolean) => any;
  onTaskDeleted?: (task: T) => any;
};

export type Task = {
  id: string;
  title: string;
  completed: boolean;
};

const setCaretPosition = (el: any, pos: number) => {
  if (el.createTextRange) {
    const range = el.createTextRange();
    range.move('character', pos);
    range.select();
  } else {
    if (el.selectionStart) {
      el.focus();
      el.setSelectionRange(pos, pos);
    } else {
      el.focus();
    }
  }
};

export const TaskList = <T extends Task = Task>(props: TaskListProps<T>) => {
  const { tasks, title, onTitleChanged, onTaskCreate, onTaskTitleChanged, onTaskCompleteChanged, onTaskDeleted } =
    props;
  if (!tasks) {
    return <Loading label='Loading' />;
  }
  const empty = <div className='py-5 px-3 text-neutral-500'>There are no tasks to show</div>;
  const titleRef = useRef<HTMLInputElement | null>(null);
  const tasksRefs = useRef<HTMLInputElement[]>([]);
  useEffect(() => {
    tasksRefs.current = tasksRefs.current.slice(0, props.tasks.length);
    console.log('sliced', tasksRefs.current.length, props.tasks.length, tasksRefs, props.tasks);
  }, [tasks, tasks.length]);
  return (
    <div role='none' className='my-5 py-2 px-6 bg-white dark:bg-neutral-700/50 rounded shadow'>
      <div>
        <Input
          ref={titleRef}
          className='text-xl'
          placeholder='Title this list ...'
          value={title ?? ''}
          autoFocus
          onChange={(e) => {
            onTitleChanged?.(e.target.value);
          }}
          onKeyUp={(e) => {
            const caret = (e.target as HTMLInputElement).selectionStart ?? 0;
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
              const el = tasksRefs.current[0];
              if (el) {
                el?.focus();
                setCaretPosition(el, caret ?? 0);
              } else if (!tasksRefs.current.length) {
                onTaskCreate?.();
              }
            }
          }}
        />
      </div>
      <List empty={empty}>
        {(tasks ?? []).map((task, i) => (
          <CheckboxItem
            ref={(el) => (el ? (tasksRefs.current[i] = el) : null)}
            key={task.id}
            autoFocus
            {...{
              placeholder: 'type here',
              text: task.title,
              isChecked: task.completed,
              onChecked: (completed) => onTaskCompleteChanged?.(task, completed),
              onTextChanged: (title) => onTaskTitleChanged?.(task, title),
              onDeleteClicked: () => onTaskDeleted?.(task),
              onInputKeyDown: (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault();
                }
              },
              onInputKeyUp: (e) => {
                const caret = (e.target as HTMLInputElement).selectionStart ?? 0;
                const goUp = () => {
                  const el = tasksRefs.current[i - 1];
                  if (el) {
                    el?.focus();
                    setCaretPosition(el, caret ?? 0);
                  } else if (i - 1 < 0) {
                    titleRef.current?.focus();
                    setCaretPosition(titleRef.current, caret);
                  }
                };
                const goDown = () => {
                  const el = tasksRefs.current[i + 1];
                  console.log(el, i, tasksRefs.current.length);
                  if (el) {
                    el?.focus();
                    setCaretPosition(el, caret ?? 0);
                  } else if (i + 1 >= tasksRefs.current.length) {
                    onTaskCreate?.();
                  }
                };
                if (e.key === 'Enter' || e.key === 'ArrowDown') {
                  goDown();
                } else if (e.key === 'ArrowUp') {
                  goUp();
                } else if (e.key === 'Backspace') {
                  if (!task.title) {
                    onTaskDeleted?.(task);
                    goUp();
                  }
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
};
