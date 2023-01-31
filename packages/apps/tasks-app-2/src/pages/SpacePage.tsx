//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useParams } from 'react-router-dom';

import { useSpace } from '@dxos/react-client';

import { TaskList } from '../containers/TaskList';

export const SpacePage = () => {
  const { spaceId } = useParams();
  const space = useSpace(spaceId);
  return space ? <TaskList space={space} /> : null;
};
