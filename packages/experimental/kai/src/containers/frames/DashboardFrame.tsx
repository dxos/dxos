//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { CardMenu, Card } from '../../components';
import { ContactList } from '../ContactList';
import { GraphComponent } from '../GraphComponent';
import { OrganizationList } from '../OrganizationList';
import { ProjectHierarchy } from '../ProjectHierarchy';
import { TaskList } from '../TaskList';

export const DashboardFrame: FC = () => {
  const { ref } = useResizeDetector();

  // TODO(burdon): Create cards here.

  const cardStyles = 'flex shrink-0';

  return (
    <div ref={ref} className='flex overflow-hidden p-4 gap-1 lg:grid lg:gap-4 lg:grid-rows-2 lg:grid-cols-6'>
      <div className={mx(cardStyles, 'col-span-2')}>
        <Card scrollbar header={<CardMenu title='Organizations' />}>
          <OrganizationList />
        </Card>
      </div>

      <div className={mx(cardStyles, 'col-span-2')}>
        <Card scrollbar header={<CardMenu title='Contacts' />}>
          <ContactList />
        </Card>
      </div>

      <div className={mx(cardStyles, 'col-span-2')}>
        <Card scrollbar header={<CardMenu title='Tasks' />}>
          <TaskList />
        </Card>
      </div>

      <div className={mx(cardStyles, 'col-span-2')}>
        <Card scrollbar header={<CardMenu title='Projects' />}>
          <ProjectHierarchy />
        </Card>
      </div>

      <div className={mx(cardStyles, 'col-span-4')}>
        <Card header={<CardMenu title='Projects' />}>
          <GraphComponent />
        </Card>
      </div>
    </div>
  );
};
