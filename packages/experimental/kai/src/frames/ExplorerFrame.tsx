//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useQuery } from '@dxos/react-client';

import { TreeComponent } from '../components';
import { useSpace } from '../hooks';
import { Organization } from '../proto';

export const ExplorerFrame = () => {
  const space = useSpace();
  const organizations = useQuery(space, Organization.filter());
  return null;

  const data = {
    name: 'Projects',
    children: organizations.map((organization) => ({
      name: organization.name,
      children: organization.projects.map((project) => ({
        name: project.name,
        children: project.tasks.map((task) => ({
          name: task.title,
          children: task.assignee
            ? [
                {
                  name: task.assignee.name
                }
              ]
            : []
        }))
      }))
    }))
  };

  return <TreeComponent data={data} />;
};

export default ExplorerFrame;
