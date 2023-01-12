//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { CardMenu, Card } from '../../components';
import {
  ContactsListCard,
  ProjectEditor,
  ProjectGraph,
  ProjectHierarchy,
  ProjectListCard,
  TaskListCard
} from '../../containers';

export const Dashboard: FC = () => {
  const { ref, height } = useResizeDetector();
  const props = height ? { minHeight: (height - 20) / 2 } : {};

  return (
    <div
      ref={ref}
      className='flex flex-1 flex-col gap-2 p-2 lg:grid lg:grid-cols-5 lg:grid-flow-row lg:gap-4 overflow-y-scroll scrollbar'
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
        <Card fade scrollbar header={<CardMenu title='Project' />}>
          <ProjectEditor />
        </Card>
      </div>

      <div className='flex flex-shrink-0 col-span-2' style={props}>
        <Card fade scrollbar header={<CardMenu title='Projects' />}>
          <ProjectHierarchy />
        </Card>
      </div>
    </div>
  );
};
