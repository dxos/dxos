//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Space } from '@dxos/client';
import { SpacesPage as BaseSpacesPage } from '@dxos/react-appkit';

import { TaskList } from '../proto';

export type SpacesPageProps = {};

export const SpacesPage = (props: SpacesPageProps) => {
  const createListItem = useCallback(async (space: Space) => {
    const list = new TaskList();
    await space.experimental.db.add(list);
  }, []);
  return <BaseSpacesPage onSpaceCreate={createListItem} />;
};
