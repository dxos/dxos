//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { PublicKey } from '@dxos/client';
import { EchoDatabase, id } from '@dxos/echo-db2';

import { useObjects, useSelection } from '../hooks';
import { Contact, Project, Task } from '../proto/tasks';
import { TaskItem, TaskList } from './TaskList';

// declare const TestTask: any;

export const ProjectList: FC<{ database: EchoDatabase; spaceKey: PublicKey }> = ({ spaceKey, database: db }) => {
  const projects = useObjects(db, Project.filter());

  const handleCreate = async () => {
    await db.save(
      new Project({
        title: `Project-${Math.random()}`,
      })
    );
  };

  return (
    <div>
      <div>
        <h2>Projects</h2>
        <button onClick={handleCreate}>Create</button>
      </div>

      <div>
        {projects.map(task => (
          <ProjectItem key={id(task)} project={task} db={db} />
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
    <div style={{ display: 'flex', paddingLeft: 20 }}>
      <input value={project.title} onChange={(e) => (project.title = e.target.value)} />
      
      <div>
        <h2><input value={project.title} onChange={(e) => (project.title = e.target.value)} /></h2>
        <button onClick={handleCreate}>Create task</button>
      </div>

      <div>
        {project.tasks.map(task => (
          <TaskItem key={id(task)} task={task} db={db} />
        ))}
      </div>
    </div>
  );
};
