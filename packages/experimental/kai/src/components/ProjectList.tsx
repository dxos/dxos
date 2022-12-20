//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { EchoDatabase, id } from '@dxos/echo-db2';

import { useDatabase, useObjects, useSelection } from '../hooks';
import { Contact, Project, Task } from '../proto/tasks';
import { TaskItem } from './TaskList';

export const ProjectList: FC<{}> = () => {
  const db = useDatabase();
  const projects = useObjects(db, Project.filter());

  const handleCreate = async () => {
    await db.save(
      new Project({
        title: `Project-${Math.random()}`
      })
    );
  };

  return (
    <div className='flex-1 m-1 border-2 border-sky-500'>
      <div className='flex'>
        <h2 className='p-2'>Projects</h2>
        <div className='flex-1' />
        <button className='mr-2 rounded-full' onClick={handleCreate}>
          Create
        </button>
      </div>

      <div>
        {projects.map((project) => (
          <ProjectItem key={id(project)} project={project} db={db} />
        ))}
      </div>
    </div>
  );
};

export const ProjectItem: FC<{ project: Project; db: EchoDatabase }> = ({ project, db }) => {
  useSelection(db, project);

  const handleCreate = async () => {
    const contacts = db.query(Contact.filter()).getObjects();
    const contact = contacts[Math.floor(Math.random() * contacts.length)];

    project.tasks.push(
      new Task({
        title: `Title-${Math.random()}`,
        assignee: contact
      })
    );
  };

  return (
    <div>
      <div>
        <h2>
          <input value={project.title} onChange={(e) => (project.title = e.target.value)} />
        </h2>
        <button onClick={handleCreate}>Create task</button>
      </div>

      <div>
        {project.tasks.map((task) => (
          <TaskItem key={id(task)} task={task} db={db} />
        ))}
      </div>
    </div>
  );
};
