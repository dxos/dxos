//
// Copyright 2022 DXOS.org
//

import { AsteriskSimple, Graph, Tree } from 'phosphor-react';
import React, { FC, useMemo, useState } from 'react';

import { GraphModel } from '@dxos/gem-spore';
import { convertTreeToGraph, createTree, TestGraphModel } from '@dxos/gem-spore/testing';
import { getSize, mx } from '@dxos/react-components';

import { Button, GraphComponent, PlexusComponent, TreeComponent } from '../components';

enum ViewType {
  GRAPH = 1,
  TREE = 2,
  PLEX = 3
}

type View = {
  type: ViewType;
  label: string;
  Icon: FC<any>; // TODO(burdon): Type.
  Component: FC<{ model: GraphModel<any> }>; // TODO(burdon): Extract and use type.
};

const views: View[] = [
  {
    type: ViewType.GRAPH,
    label: 'Graph',
    Icon: Graph,
    Component: GraphComponent
  },
  {
    type: ViewType.PLEX,
    label: 'Brane',
    Icon: AsteriskSimple,
    Component: PlexusComponent
  },
  {
    type: ViewType.TREE,
    label: 'Tree',
    Icon: Tree,
    Component: TreeComponent
  }
];

export const ExplorerFrame = () => {
  const [view, setView] = useState(ViewType.TREE);

  // TODO(burdon): Echo model.
  const model = useMemo(() => {
    const root = createTree({ depth: 4, children: 4 });
    const model = new TestGraphModel(convertTreeToGraph(root));
    model.setSelected(root.id);
    return model;
  }, []);

  // const space = useSpace();
  // const organizations = useQuery(space, Organization.filter());
  // const data = {
  //   name: 'Projects',
  //   children: organizations.map((organization) => ({
  //     name: organization.name,
  //     children: organization.projects.map((project) => ({
  //       name: project.title,
  //       children: project.tasks.map((task) => ({
  //         name: task.title,
  //         children: task.assignee
  //           ? [
  //               {
  //                 name: task.assignee.name
  //               }
  //             ]
  //           : []
  //       }))
  //     }))
  //   }))
  // };

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
            <Component model={model} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExplorerFrame;
