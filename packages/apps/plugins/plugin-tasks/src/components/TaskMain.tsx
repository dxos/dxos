//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

import { TaskBlock } from './TaskBlock';
import { type Task } from './TaskList';

export const TaskMain: FC<{ task?: Task }> = ({ task }) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      {task && <TaskBlock task={task} />}
    </Main.Content>
  );
};
