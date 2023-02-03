//
// Copyright 2022 DXOS.org
//

import { Graph, Tree } from 'phosphor-react';
import React, { useState } from 'react';

import { useQuery } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button, GraphComponent, TreeComponent } from '../components';
import { useSpace } from '../hooks';
import { Organization } from '../proto';

enum View {
  GRAPH = 1,
  TREE = 2
}

export const ExplorerFrame = () => {
  const space = useSpace();
  const organizations = useQuery(space, Organization.filter());
  const [view, setView] = useState(View.GRAPH);

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
      <div className='flex w-full p-2 px-3 bg-gray-200 text-gray-500'>
        <div className='flex-1' />
        <Button className={mx('mx-1', view === View.GRAPH && 'text-black')} onClick={() => setView(View.GRAPH)}>
          <Graph className={getSize(6)} />
        </Button>
        <Button className={mx('mx-1', view === View.TREE && 'text-black')} onClick={() => setView(View.TREE)}>
          <Tree className={getSize(6)} />
        </Button>
      </div>

      <div className='flex flex-1 scroll-auto'>
        <div className={mx(view === View.GRAPH ? 'flex flex-1' : 'hidden')}>
          <GraphComponent data={data} />
        </div>
        <div className={mx(view === View.TREE ? 'flex flex-1' : 'hidden')}>
          <TreeComponent data={data} />
        </div>
      </div>
    </div>
  );
};

export default ExplorerFrame;
