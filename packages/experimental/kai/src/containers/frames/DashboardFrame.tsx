//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { CardMenu, Card, GraphComponent } from '../../components';
import { ContactList } from '../ContactList';
import { OrganizationList } from '../OrganizationList';
import { ProjectHierarchy } from '../ProjectHierarchy';
import { TaskList } from '../TaskList';

export const DashboardFrame: FC = () => {
  const { ref } = useResizeDetector();
  const cardStyles = 'flex shrink-0';

  return (
    <div
      ref={ref}
      className={mx(
        'flex flex-col h-full p-0 gap-0 overflow-x-hidden overflow-y-scroll',
        'lg:p-2 lg:gap-3 lg:grid lg:overflow-hidden lg:grid-cols-3 lg:grid-rows-2'
      )}
    >
      <div className={mx(cardStyles)}>
        <Card scrollbar header={<CardMenu title='Organizations' />}>
          <OrganizationList />
        </Card>
      </div>

      <div className={mx(cardStyles)}>
        <Card scrollbar header={<CardMenu title='Contacts' />}>
          <ContactList />
        </Card>
      </div>

      <div className={mx(cardStyles)}>
        <Card scrollbar header={<CardMenu title='Tasks' />}>
          <TaskList />
        </Card>
      </div>

      <div className={mx(cardStyles)}>
        <Card scrollbar header={<CardMenu title='Projects' />}>
          <ProjectHierarchy />
        </Card>
      </div>

      <div className={mx(cardStyles, 'col-span-2 hidden lg:flex')}>
        <Card header={<CardMenu title='Explorer' />}>
          <GraphComponent />
        </Card>
      </div>
    </div>
  );
};
