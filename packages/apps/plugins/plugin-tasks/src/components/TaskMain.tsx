//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Task as TaskType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, textBlockWidth, mx, inputSurface } from '@dxos/react-ui-theme';

import { type Task, TaskList } from './Task';

// TODO(burdon): Style like document.
export const TaskMain: FC<{ task?: Task }> = ({ task }) => {
  return (
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx(textBlockWidth, inputSurface, 'pli-2')}>
        <div role='none' className={mx('pbs-4 pbe-4', 'min-bs-[calc(100dvh-var(--topbar-size))] flex flex-col')}>
          <TaskList.Root tasks={task?.subtasks} onCreate={() => new TaskType()} />
        </div>
      </div>
    </Main.Content>
  );
};

export const TaskSection: FC<{ task?: Task }> = ({ task }) => {
  return (
    <div role='none' className='flex flex-col w-full pbs-4 pbe-4'>
      <TaskList.Root tasks={task?.subtasks} onCreate={() => new TaskType()} />
    </div>
  );
};
