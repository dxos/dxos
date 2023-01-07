//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';

import { Card, FolderHierarchy, FolderHierarchyItem } from '../components';
import { useSpace } from '../hooks';
import { Project } from '../proto';

export const mapProjectToItem = (project: Project): FolderHierarchyItem => ({
  id: project[id],
  title: project.title,
  items: project.tasks?.map((task) => ({
    id: task[id],
    title: task.title,
    items: task.assignee
      ? [
          {
            id: task.assignee[id],
            title: task.assignee.name
          }
        ]
      : undefined
  }))
});

export const ProjectTree = withReactor(() => {
  const { space } = useSpace();
  // TODO(burdon): useQuery should not return undefined.
  // TODO(burdon): Need subscription for children.
  const projects = useQuery(space, Project.filter()) ?? [];
  const items = projects.map((project) => mapProjectToItem(project));

  return (
    <Card title='Projects' scrollbar className='bg-orange-400'>
      <div className='mt-2'>
        <FolderHierarchy items={items} highlightClassName='bg-slate-200' />
      </div>
    </Card>
  );
});
