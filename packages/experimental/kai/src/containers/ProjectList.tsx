//
// Copyright 2022 DXOS.org
//

import { Archive, Plus, PlusCircle, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, useReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { Card, Input, TableRow } from '../components';
import { useSpace } from '../hooks';
import { Project, Task, createProject, createTask } from '../proto';
import { DraggableTaskList } from './DraggableTaskList';

export const ProjectList: FC<{}> = () => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());

  const handleCreate = async () => {
    await createProject(space.experimental.db);
  };

  const Menubar = () => (
    <button onClick={handleCreate}>
      <PlusCircle className={getSize(6)} />
    </button>
  );

  return (
    <Card title='Projects' fade scrollbar className='bg-cyan-400' menubar={<Menubar />}>
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

export const ProjectItem: FC<{ project: Project }> = ({ project }) => {
  const { space } = useSpace();
  const { render } = useReactor();

  const handleGenerateTask = async () => {
    const task = await createTask(space.experimental.db);
    project.tasks.push(task);
    // TODO(burdon): Can't set array. new OrderedSet().
    // project.tasks = [task];
    if (task.assignee) {
      project.team.push(task.assignee);
    }
  };

  // TODO(burdon): Implement splice.
  const handleDrag = (active: number, over: number) => {
    const task1 = project.tasks[active];
    const task2 = project.tasks[over];
    console.log(task1, task2);
    // project.tasks = new OrderedSet([new Task({ title: 't1' })]);
  };

  return render(
    <div className='flex flex-col pb-2'>
      {/* Header */}
      <div className='flex p-2 pb-0 items-center'>
        <div className='flex flex-shrink-0 justify-center w-8 mr-1'>
          <Archive className={getSize(6)} />
        </div>
        <Input
          className='w-full p-1 text-lg outline-0'
          spellCheck={false}
          value={project.title}
          onChange={(value) => (project.title = value)}
        />
        <button className='mr-2 text-gray-500' onClick={handleGenerateTask}>
          <Plus className={getSize(6)} />
        </button>
      </div>

      {/* Tasks */}
      {project.tasks?.length > 0 && (
        <div>
          <h2 className='pl-3 pt-1 pb-1 text-xs'>Tasks</h2>
          <DraggableTaskList
            tasks={project.tasks}
            onCreate={(task: Task) => {
              project.tasks.push(task);
            }}
            onDrag={handleDrag}
          />
        </div>
      )}

      {/* Contacts */}
      {project.team?.length > 0 && (
        <div className='pt-2'>
          <h2 className='pl-3 text-xs'>Team</h2>
          <div className='p-1 pt-1'>
            {project.team?.map((contact) => (
              <TableRow key={contact[id]} sidebar={<User />} header={<div>{contact.name}</div>} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
