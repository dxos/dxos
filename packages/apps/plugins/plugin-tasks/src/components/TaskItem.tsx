//
// Copyright 2023 DXOS.org
//

import React, { type FC, type KeyboardEvent } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { Input } from '@dxos/react-ui';

export type Task = {
  id: string;
  done?: boolean;
  title?: string;
  text?: TextObject;
  subtasks?: Task[];
};

export type TaskItemProps = {
  task: Task;
  foucs?: boolean;
  spellCheck?: boolean;
  onEnter?: (task: Task) => void;
  onIndent?: (task: Task, back?: boolean) => void;
};

export const TaskItem: FC<TaskItemProps> = ({ task, foucs, spellCheck = false, onEnter, onIndent }) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowUp':
        // TODO(burdon): Shift to move.
        break;
      case 'ArrowDown':
        break;
      case 'Tab':
        onIndent?.(task, event.shiftKey);
        break;
      case 'Enter':
        // TODO(burdon): Insert above if at start of line (or split).
        onEnter?.(task);
        break;
      case 'Escape':
        break;
      case 'Delete':
        break;
    }
  };

  return (
    <div className='flex items-center px-2 gap-2'>
      <Input.Root>
        <Input.Checkbox
          checked={task.done}
          onCheckedChange={(checked) => {
            task.done = !!checked;
          }}
        />
      </Input.Root>
      <Input.Root>
        <Input.TextInput
          autoFocus={foucs}
          autoComplete='off'
          placeholder='Enter text'
          spellCheck={spellCheck}
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
