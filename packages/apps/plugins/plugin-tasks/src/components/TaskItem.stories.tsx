//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { deepSignal } from 'deepsignal/react';

// eslint-disable-next-line
import React from 'react';

import { TaskItem } from './TaskItem';

export default {
  component: TaskItem,
};

// TODO(burdon): Deep signal
export const Default = {
  args: {
    task: deepSignal({
      id: 'task-1',
      title: 'Hello',
    }),
  },
};
