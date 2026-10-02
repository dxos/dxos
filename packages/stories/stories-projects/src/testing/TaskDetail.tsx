//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { useSelection } from '@dxos/react-ui-attention';
import { type ResolvedCellProps } from '@dxos/storybook-testing';
import { Task } from '@dxos/types';

export const TaskDetail = ({ object, attendableId }: ResolvedCellProps) => {
  const project = Obj.instanceOf(Project.Project, object) ? object : undefined;
  const taskSet = useResolveRef(project?.taskSet);
  const tasks = useQuery(
    Obj.getDatabase(object),
    taskSet ? Filter.and(Filter.type(Task.Task), Filter.childOf(taskSet)) : Filter.nothing(),
  );
  const selected = useSelection(attendableId, 'single');
  const task = tasks.find(({ id }) => id === selected);
  if (!task) {
    return null;
  }

  return (
    <Surface.Surface
      type={AppSurface.Article}
      data={{ subject: task, attendableId: `${attendableId}/${task.id}` }}
      limit={1}
    />
  );
};
