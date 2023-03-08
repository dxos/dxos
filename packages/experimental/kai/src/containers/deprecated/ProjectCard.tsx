//
// Copyright 2022 DXOS.org
//

import { Archive, User } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { Project, Task } from '@dxos/kai-types';
import { observer } from '@dxos/react-client';
import { getSize, List, ListItem, ListItemEndcap, ListItemHeading, mx, Input } from '@dxos/react-components';

import { TaskList } from './TaskList';

// TODO(burdon): Reconcile with other cards.
export const ProjectCard: FC<{ space: Space; object: Project }> = observer(({ space, object }) => {
  // TODO(burdon): Pass in Task1, Task2.
  const handleDrag = (active: number, over: number) => {
    const task = object.tasks[active];
    object.tasks.splice(active, 1);
    object.tasks.splice(over, 0, task);
  };

  return (
    <div className='flex flex-col pb-2 md:rounded border'>
      {/* Header */}
      <div role='none' className='flex pli-1.5 pbs-1.5 items-center'>
        <div className={mx(getSize(10), 'flex items-center justify-center')}>
          <Archive className={getSize(6)} />
        </div>
        <Input
          variant='subdued'
          label='Project name'
          labelVisuallyHidden
          placeholder='Project name'
          slots={{ root: { className: 'grow' }, input: { spellCheck: false } }}
          value={object.title}
          onChange={({ target: { value } }) => (object.title = value)}
        />
      </div>

      {/* Tasks */}
      <div className='p-1.5'>
        <TaskList
          space={space}
          id={object.id}
          tasks={object.tasks}
          onCreate={(task: Task) => {
            object.tasks.push(task);
          }}
          onMoveItem={handleDrag}
        />
      </div>

      {/* Contacts */}
      {object.team?.length > 0 && (
        <div className='pt-2'>
          <h2 className='pl-2 text-xs'>Team</h2>
          <List labelId='todo' slots={{ root: { className: 'mlb-1' } }}>
            {object.team?.map((contact) => (
              <ListItem key={contact.id}>
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
