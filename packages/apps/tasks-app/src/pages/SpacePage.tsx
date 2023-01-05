//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Item, ObjectModel, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';

import { TaskList, TASK_LIST } from '../containers';

export const SpacePage = () => {
  const { space } = useOutletContext<{ space: Space }>();

  const [item] = useSelection<Item<ObjectModel>>(space?.select().filter({ type: TASK_LIST })) ?? [];

  return item ? <TaskList space={space} taskList={item} /> : <Loading label='Loading' size='md' />;
};
