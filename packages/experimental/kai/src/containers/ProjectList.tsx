//
// Copyright 2022 DXOS.org
//

import { Archive, Plus, PlusCircle, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-db2';
import { getSize } from '@dxos/react-ui';

import { Card, Input, Table } from '../components';
import { useObjects, useSelection, useSpace } from '../hooks';
import { createProject, createTask, Project } from '../proto';
import { TaskItem } from './TaskList';

export const ProjectList: FC<{}> = () => {
  const { database: db } = useSpace();
  const projects = useObjects(Project.filter());

  const handleCreate = async () => {
    await createProject(db);
  };

  const Menubar = () => (
    <button className='mr-2' onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title='Projects' menubar={<Menubar />}>
      <>
        {projects.map((project) => (
          <div key={id(project)} className='border-b'>
            <ProjectItem project={project} />
          </div>
        ))}
      </>
    </Card>
  );
};

export const ProjectItem: FC<{ project: Project }> = ({ project }) => {
  const { database: db } = useSpace();
  useSelection([project, ...(project.tasks ?? []), ...(project.team ?? [])]);

  const handleCreate = async () => {
    const task = await createTask(db);
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
              <TaskItem key={id(task)} task={task} />
            ))}
          </div>
        </div>
      )}

      {project.team?.length > 0 && (
        <div>
          <h2 className='pl-3 text-xs'>Team</h2>
          <div className='p-3 pt-1'>
            {project.team?.map((contact) => (
              <Table key={id(contact)} sidebar={<User />} header={<div>{contact.name}</div>} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
