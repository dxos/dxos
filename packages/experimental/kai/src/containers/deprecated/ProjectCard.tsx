//
// Copyright 2022 DXOS.org
//

import { Archive, ArrowsOut, User } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { id } from '@dxos/echo-schema';
import { withReactor } from '@dxos/react-client';
import { getSize, List, ListItem, ListItemEndcap, ListItemHeading, mx, Input, Button } from '@dxos/react-components';

import { Project, Task } from '../../proto';
import { TaskList } from './TaskList';

export const ProjectCard: FC<{ space: Space; project: Project }> = withReactor(({ space, project }) => {
  const handleExpand = () => {};

  // TODO(burdon): Pass in Task1, Task2.
  const handleDrag = (active: number, over: number) => {
    const task = project.tasks[active];
    project.tasks.splice(active, 1);
    project.tasks.splice(over, 0, task);
  };

  return (
    <div className='flex flex-col pb-2'>
      {/* Header */}
      <div role='none' className='flex pli-1.5 pbs-1.5 items-center'>
        <div className={mx(getSize(10), 'flex items-center justify-center')}>
          <Archive className={getSize(6)} />
        </div>
        <Input
          variant='subdued'
          label='Project name'
          slots={{ root: { className: 'm-0 grow' }, label: { className: 'sr-only' }, input: { spellCheck: false } }}
          value={project.title}
          onChange={({ target: { value } }) => (project.title = value)}
          placeholder='Project name'
        />
        <Button compact variant='ghost' className={mx(getSize(10), 'text-gray-500')} onClick={handleExpand}>
          <ArrowsOut className={getSize(5)} />
        </Button>
      </div>

      {/* Tasks */}
      <div className='p-1.5'>
        <TaskList
          space={space}
          id={project[id]}
          tasks={project.tasks}
          onCreate={(task: Task) => {
            project.tasks.push(task);
          }}
          onMoveItem={handleDrag}
        />
      </div>

      {/* Contacts */}
      {project.team?.length > 0 && (
        <div className='pt-2'>
          <h2 className='pl-3 text-xs'>Team</h2>
          <List labelId='todo' slots={{ root: { className: 'mlb-1' } }}>
            {project.team?.map((contact) => (
              <ListItem key={contact[id]}>
                <ListItemEndcap className={getSize(6)}>
                  <User className={mx(getSize(4), 'mbs-1')} />
                </ListItemEndcap>
                <ListItemHeading className='text-sm mbs-0.5'>{contact.name}</ListItemHeading>
              </ListItem>
            ))}
          </List>
        </div>
      )}
    </div>
  );
});
