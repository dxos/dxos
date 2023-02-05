//
// Copyright 2022 DXOS.org
//

import { AsteriskSimple, Graph, Tree } from 'phosphor-react';
import React, { useState } from 'react';

import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button, GraphComponent, Plex, TreeComponent } from '../components';
import { useSpace } from '../hooks';
import { Organization } from '../proto';

enum View {
  GRAPH = 1,
  TREE = 2,
  PLEX = 3
}

const views = [
  {
    type: View.GRAPH,
    label: 'Graph',
    Icon: Graph,
    Component: GraphComponent
  },
  {
    type: View.TREE,
    label: 'Tree',
    Icon: Tree,
    Component: TreeComponent
  },
  {
    type: View.PLEX,
    label: 'Brane',
    Icon: AsteriskSimple,
    Component: Plex
  }
];

export const BraneFrame = () => {
  const space = useSpace();
  const organizations = useQuery(space, Organization.filter());
  const [view, setView] = useState(View.PLEX);

  const data = {
    name: 'Projects',
    children: organizations.map((organization) => ({
      name: organization.name,
      children: organization.projects.map((project) => ({
        name: project.title,
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

  return (
    <div className='flex flex-1 flex-col'>
      {/* Header */}
      <div className='flex w-full p-2 px-3 bg-gray-200 text-gray-500'>
        <div className='flex-1' />
        {views.map(({ type, label, Icon }) => (
          <Button
            key={type}
            title={label}
            className={mx('mx-1', view === type && 'text-black')}
            onClick={() => setView(type)}
          >
            <Icon className={getSize(6)} />
          </Button>
        ))}
      </div>

      {/* Body */}
      <div className='flex flex-1 overflow-hidden'>
        {views.map(({ type, Component }) => (
          <div key={type} className={mx(view === type ? 'flex w-full' : 'hidden')}>
            <Component data={data} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BraneFrame;
