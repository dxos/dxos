//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Card, FolderHierarchy } from '../components';
import { useSpace } from '../hooks';
import { Project } from '../proto';

const mapProject = (project: Project) => ({
  id: project[id],
  title: project.title,
  items: project.tasks.map((task) => ({
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

export const ProjectTree = () => {
  const { space } = useSpace();
  // TODO(burdon): Need subscription for children.
  const projects = useQuery(space, Project.filter());
  const items = useMemo(() => projects.map((project) => mapProject(project)), [projects]);

  return (
    <Card title='Projects' scrollbar className='bg-orange-400'>
      <div className='mt-2'>
        <FolderHierarchy items={items} highlightClassName='bg-slate-200' />
      </div>
    </Card>
  );
};
