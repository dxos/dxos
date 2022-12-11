//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Item, ObjectModel, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { Loading, useTranslation } from '@dxos/react-uikit';
import { TaskList, TASK_LIST } from '../containers/TaskList';

export const SpacePage = () => {
  const { t } = useTranslation();
  const { space } = useOutletContext<{ space: Space }>();

  const [item] = useSelection<Item<ObjectModel>>(space?.select().filter({ type: TASK_LIST })) ?? [];

  return item ? <TaskList space={space} taskList={item} /> : <Loading label={t('generic loading label')} size='md' />;
};
