//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { TileMenu, Tile, GraphComponent } from '../../components';
import { ContactList } from '../ContactList';
import { OrganizationList } from '../OrganizationList';
import { ProjectHierarchy } from '../ProjectHierarchy';
import { TaskList } from '../TaskList';

export const StackFrame: FC = () => {
  const { ref } = useResizeDetector();
  const cardStyles = 'flex shrink-0';

  return (
    <div
      ref={ref}
      className={mx(
        'flex flex-col h-full p-0 gap-0 overflow-x-hidden overflow-y-scroll',
        'md:p-2 md:gap-3 md:grid md:overflow-hidden md:grid-cols-2 md:grid-rows-2',
        'lg:p-2 lg:gap-3 lg:grid lg:overflow-hidden lg:grid-cols-3 lg:grid-rows-2'
      )}
    >
      <div className={mx(cardStyles)}>
        <Tile scrollbar header={<TileMenu title='Organizations' />}>
          <OrganizationList />
        </Tile>
      </div>

      <div className={mx(cardStyles)}>
        <Tile scrollbar header={<TileMenu title='Contacts' />}>
          <ContactList />
        </Tile>
      </div>

      <div className={mx(cardStyles)}>
        <Tile scrollbar header={<TileMenu title='Tasks' />}>
          <TaskList />
        </Tile>
      </div>

      <div className={mx(cardStyles)}>
        <Tile scrollbar header={<TileMenu title='Projects' />}>
          <ProjectHierarchy />
        </Tile>
      </div>

      <div className={mx(cardStyles, 'col-span-2 hidden lg:flex')}>
        <Tile header={<TileMenu title='Explorer' />}>
          <GraphComponent />
        </Tile>
      </div>
    </div>
  );
};
