//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import { Plus } from 'phosphor-react';
import React, { FC } from 'react';

import { db, id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-ui';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Project } from '../proto/tasks';
import { Card } from './Card';
import { createTask, TaskItem } from './TaskList';

export const ProjectList: FC<{}> = () => {
  const db = useDatabase();
  const projects = useObjects(db, Project.filter());

  const handleCreate = async () => {
    await db.save(
      new Project({
        title: faker.commerce.productAdjective() + ' ' + faker.commerce.product()
      })
    );
  };

  const Menubar = () => (
    <div className='flex p-2 bg-sky-400'>
      <h2>Projects</h2>
      <div className='flex-1' />
      <button className='mr-2' onClick={handleCreate}>
        <Plus className={getSize(5)} />
      </button>
    </div>
  );

  return (
    <Card menubar={<Menubar />}>
      <>
        {projects.map((project) => (
          <ProjectItem key={id(project)} project={project} />
        ))}
      </>
    </Card>
  );
};

export const ProjectItem: FC<{ project: Project }> = ({ project }) => {
  useSelection(db(project), project);

  const handleCreate = async () => {
    project.tasks.push(await createTask(db(project)));
  };

  return (
    <div className='p-2 bg-white'>
      <div className='flex'>
        <input
          className='w-full p-1 outline-0'
          value={project.title}
          onChange={(e) => (project.title = e.target.value)}
        />
        <button className='mr-2' onClick={handleCreate}>
          <Plus className={getSize(5)} />
        </button>
      </div>

      <div>
        {project.tasks.map((task) => (
          <TaskItem key={id(task)} task={task} />
        ))}
      </div>
    </div>
  );
};
