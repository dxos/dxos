//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Card, Button, CardMenu } from '../components';
import { useGenerator, useSpace } from '../hooks';
import { Project } from '../proto';
import { ProjectCard } from './cards';

export const ProjectListCard: FC = () => {
  const generator = useGenerator();

  const handleCreate = async () => {
    await generator.createProject();
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

export const ProjectList: FC<{ header?: boolean }> = (_props) => {
  const space = useSpace();
  const projects = useQuery(space, Project.filter());

  return (
    <div className='is-full flex-1 bg-gray-100'>
      <div className='is-full md:max-is-[600px] mli-auto bg-white'>
        {projects.map((project) => (
          <div key={project[id]}>
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
    </div>
  );
};
