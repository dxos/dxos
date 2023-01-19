//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { CardMenu, Card } from '../components';
import { ContactsListCard } from './ContactList';
import { ProjectEditor } from './ProjectEditor';
import { ProjectGraph } from './ProjectGraph';
import { ProjectHierarchy } from './ProjectHierarchy';
import { ProjectListCard } from './ProjectList';
import { TaskListCard } from './TaskList';

const dashboardItemStyles = 'flex shrink-0 max-bs-[80vh] lg:max-bs-[40vh]';

export const Dashboard: FC = () => {
  const { ref } = useResizeDetector();

  return (
    <div ref={ref} className='flex flex-col p-4 gap-2 lg:grid lg:grid-cols-5 lg:auto-rows-auto lg:gap-4'>
      <div className={mx(dashboardItemStyles, 'col-span-2')}>
        <ProjectListCard />
      </div>

      <div className={mx(dashboardItemStyles, 'col-span-2')}>
        <ContactsListCard />
      </div>

      <div className={mx(dashboardItemStyles, 'row-span-3')}>
        <TaskListCard />
      </div>

      <div className={dashboardItemStyles}>
        <TaskListCard title='Completed Tasks' completed readonly />
      </div>

      <div className={mx(dashboardItemStyles, 'col-span-3')}>
        <Card header={<CardMenu title='Projects' />}>
          <ProjectGraph />
        </Card>
      </div>

      <div className={mx(dashboardItemStyles, 'col-span-2')}>
        <Card scrollbar header={<CardMenu title='Project' />}>
          <ProjectEditor />
        </Card>
      </div>

      <div className={mx(dashboardItemStyles, 'col-span-2')}>
        <Card scrollbar header={<CardMenu title='Projects' />}>
          <ProjectHierarchy />
        </Card>
      </div>
    </div>
  );
};
