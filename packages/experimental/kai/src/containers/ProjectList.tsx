//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Card, Button, CardMenu } from '../components';
import { useSpace } from '../hooks';
import { Project, createProject } from '../proto';
import { ProjectCard } from './cards';

export const ProjectListCard: FC = () => {
  const { space } = useSpace();

  const handleCreate = async () => {
    await createProject(space.experimental.db);
  };

  const Header = () => (
    <CardMenu title='Projects'>
      <Button onClick={handleCreate}>
        <PlusCircle className={getSize(5)} />
      </Button>
    </CardMenu>
  );

  return (
    <Card scrollbar header={<Header />}>
      <ProjectList />
    </Card>
  );
};

export const ProjectList: FC<{ header?: boolean }> = ({ header = false }) => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());

  return (
    <div className='flex flex-1 justify-center overflow-hidden bg-gray-100'>
      <div className='flex flex-col overflow-y-scroll is-full md:is-[600px] bg-white'>
        {projects.map((project) => (
          <div key={project[id]}>
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
    </div>
  );
};
