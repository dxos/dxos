//
// Copyright 2022 DXOS.org
//

import { Archive, Plus, PlusCircle, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { getSize } from '@dxos/react-ui';

import { Card, Input, Table } from '../components';
import { useSpace } from '../hooks';
import { createProject, createTask, Project } from '../proto';
import { TaskItem } from './TaskList';
import { makeReactive, useQuery } from '@dxos/react-client';

export const ProjectList: FC<{}> = () => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());

  const handleCreate = async () => {
    await createProject(space.db2);
  };

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title='Projects' className='bg-cyan-400' menubar={<Menubar />}>
      <>
        {projects.map((project) => (
          <div key={project[id]} className='border-b'>
            <ProjectItem project={project} />
          </div>
        ))}
      </>
    </Card>
  );
};

export const ProjectItem = makeReactive<{ project: Project }>(({ project }) => {
  const { space } = useSpace();

  const handleCreate = async () => {
    const task = await createTask(space.db2);
    project.tasks.push(task);
    if (task.assignee) {
      project.team.push(task.assignee);
    }
  };

  return (
    <div className='flex flex-col'>
      <div className='flex p-2 pb-0 items-center'>
        <div className='pl-2 pr-1'>
          <Archive className={getSize(6)} />
        </div>
        <Input
          className='w-full p-1 text-lg outline-0'
          spellCheck={false}
          value={project.title}
          onChange={(value) => (project.title = value)}
        />
        <button className='mr-2 text-gray-500' onClick={handleCreate}>
          <Plus className={getSize(6)} />
        </button>
      </div>

      {project.tasks?.length > 0 && (
        <div>
          <h2 className='pl-3 pt-1 text-xs'>Tasks</h2>
          <div className='p-3 pt-1'>
            {project.tasks?.map((task) => (
              <TaskItem key={task[id]} task={task} />
            ))}
          </div>
        </div>
      )}

      {project.team?.length > 0 && (
        <div>
          <h2 className='pl-3 text-xs'>Team</h2>
          <div className='p-3 pt-1'>
            {project.team?.map((contact) => (
              <Table key={contact[id]} sidebar={<User />} header={<div>{contact.name}</div>} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
