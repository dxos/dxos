//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { CardMenu, Card } from '../components';
import { ContactsListCard } from './ContactList';
import { ProjectEditor } from './ProjectEditor';
import { ProjectGraph } from './ProjectGraph';
import { ProjectHierarchy } from './ProjectHierarchy';
import { ProjectListCard } from './ProjectList';
import { TaskListCard } from './TaskList';

export const Dashboard: FC = () => {
  const { ref, height } = useResizeDetector();
  const props = height ? { minHeight: (height - 16) / 2 } : {};

  return (
    <div
      ref={ref}
      className='basis-[calc(100vh-84px)] flex flex-1 flex-col p-4 gap-2 lg:grid lg:grid-cols-5 lg:grid-flow-row lg:gap-4 overflow-y-scroll scrollbar'
    >
      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <ProjectListCard />
      </div>

      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <ContactsListCard />
      </div>

      <div className='flex flex-shrink-0 row-span-2' style={props}>
        <TaskListCard />
      </div>

      <div className='flex flex-shrink-0' style={props}>
        <TaskListCard title='Completed Tasks' completed readonly />
      </div>

      <div className='flex flex-shrink-0 col-span-3' style={props}>
        <Card header={<CardMenu title='Projects' />}>
          <ProjectGraph />
        </Card>
      </div>

      <div className='flex flex-shrink-0 col-span-3' style={props}>
        <Card scrollbar header={<CardMenu title='Project' />}>
          <ProjectEditor />
        </Card>
      </div>

      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <Card scrollbar header={<CardMenu title='Projects' />}>
          <ProjectHierarchy />
        </Card>
      </div>
    </div>
  );
};
