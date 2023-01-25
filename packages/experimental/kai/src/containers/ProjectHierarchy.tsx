//
// Copyright 2023 DXOS.org
//

import { Archive, CheckSquare, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';

import { FolderHierarchy, FolderHierarchyItem } from '../components';
import { useSpace } from '../hooks';
import { Project } from '../proto';

export const mapProjectToItem = (project: Project): FolderHierarchyItem => ({
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

export const ProjectHierarchy: FC<{ header?: boolean }> = withReactor(({ header = false }) => {
  const space = useSpace(); // TODO(burdon): Factor out.
  // TODO(burdon): useQuery should not return undefined.
  // TODO(burdon): Need subscription for children.
  const projects = useQuery(space, Project.filter()) ?? [];
  const items = projects.map((project) => mapProjectToItem(project));

  return (
    <div className='mt-2'>
      <FolderHierarchy items={items} highlightClassName='bg-slate-200' />
    </div>
  );
});
