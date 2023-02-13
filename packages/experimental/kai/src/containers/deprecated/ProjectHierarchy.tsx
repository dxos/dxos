//
// Copyright 2023 DXOS.org
//

import { Archive, CheckSquare, User } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { TreeView, TreeViewItem } from '@dxos/react-components';

import { Project } from '../../proto';

export const mapProjectToItem = (project: Project): TreeViewItem => ({
  id: project[id],
  title: project.title,
  Icon: Archive,
  items: project.tasks?.map((task) => ({
    id: task[id],
    title: task.title,
    Icon: CheckSquare,
    items: task.assignee
      ? [
          {
            id: task.assignee[id],
            title: task.assignee.name,
            Icon: User
          }
        ]
      : undefined
  }))
});

export const ProjectHierarchy: FC<{ space: Space; header?: boolean }> = withReactor(({ space, header = false }) => {
  // TODO(burdon): useQuery should not return undefined.
  // TODO(burdon): Need subscription for children.
  const projects = useQuery(space, Project.filter()) ?? [];
  const items = projects.map((project) => mapProjectToItem(project));

  return (
    <div className='mt-2'>
      <TreeView items={items} highlightClassName='bg-slate-200' />
    </div>
  );
});
