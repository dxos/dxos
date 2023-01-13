//
// Copyright 2022 DXOS.org
//

import { Archive, Plus, PlusCircle, User } from 'phosphor-react';
import React, { FC } from 'react';

import { id } from '@dxos/echo-schema';
import { useQuery, withReactor } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Card, Input, CardRow, Button, CardMenu } from '../components';
import { useSpace } from '../hooks';
import { Project, Task, createProject, createTask } from '../proto';
import { DraggableTaskList } from './DraggableTaskList';

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
    <Card fade scrollbar header={<Header />}>
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
            <ProjectItem project={project} />
          </div>
        ))}
      </div>
    </div>
  );
};

export const ProjectItem: FC<{ project: Project }> = withReactor(({ project }) => {
  const { space } = useSpace();

  const handleGenerateTask = async () => {
    const task = await createTask(space.experimental.db);
    project.tasks.push(task);
    // TODO(burdon): Can't set array. new OrderedSet().
    // project.tasks = [task];
    if (task.assignee) {
      project.team.push(task.assignee);
    }
  };

  // TODO(burdon): Pass in Task1, Task2.
  const handleDrag = (active: number, over: number) => {
    const task = project.tasks[active];
    project.tasks.splice(active, 1);
    project.tasks.splice(over, 0, task);
  };

  return (
    <div className='flex flex-col pb-2'>
      {/* Header */}
      <div className='flex p-2 pb-0 items-center'>
        <div className='flex flex-shrink-0 justify-center w-8 mr-1'>
          <Archive className={getSize(6)} />
        </div>
        <Input
          className='w-full p-1 text-lg'
          spellCheck={false}
          value={project.title}
          onChange={(value) => (project.title = value)}
        />
        <Button className='mr-2 text-gray-500' onClick={handleGenerateTask}>
          <Plus className={getSize(5)} />
        </Button>
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
              <CardRow key={contact[id]} sidebar={<User />} header={<div>{contact.name}</div>} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
