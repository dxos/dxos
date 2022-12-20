//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { FC } from 'react';

import { db, id } from '@dxos/echo-db2';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Project } from '../proto/tasks';
import { createTask, TaskItem } from './TaskList';

export const ProjectList: FC<{}> = () => {
  const db = useDatabase();
  const projects = useObjects(db, Project.filter());

  const handleCreate = async () => {
    await db.save(
      new Project({
        title: faker.commerce.product()
      })
    );
  };

  return (
    <div className='flex-1 m-1 border-2 border-sky-500'>
      <div className='flex'>
        <h2 className='p-2'>Projects</h2>
        <div className='flex-1' />
        <button className='mr-2 rounded-full' onClick={handleCreate}>
          Create Project
        </button>
      </div>

      <div>
        {projects.map((project) => (
          <ProjectItem key={id(project)} project={project} />
        ))}
      </div>
    </div>
  );
};

export const ProjectItem: FC<{ project: Project }> = ({ project }) => {
  useSelection(db(project), project);

  const handleCreate = async () => {
    project.tasks.push(await createTask(db(project)));
  };

  return (
    <div>
      <div>
        <input
          className='w-full p-1 outline-0'
          value={project.title}
          onChange={(e) => (project.title = e.target.value)}
        />
        <div className='p-2'>
          <button className='mr-2 rounded-full' onClick={handleCreate}>
            Create Task
          </button>
        </div>
      </div>

      <div>
        {project.tasks.map((task) => (
          <TaskItem key={id(task)} task={task} />
        ))}
      </div>
    </div>
  );
};
