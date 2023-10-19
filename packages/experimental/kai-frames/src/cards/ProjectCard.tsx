//
// Copyright 2022 DXOS.org
//

import { Archive, User } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { List, ListItem } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Project, Task } from '@dxos/kai-types';
import { Input } from '@dxos/react-appkit';
import { base, Space } from '@dxos/react-client/echo';

import { TaskList } from './TaskList';

// TODO(burdon): Reconcile with other cards.
export const ProjectCard: FC<{ space: Space; object: Project }> = ({ space, object }) => {
  // TODO(burdon): Pass in Task1, Task2.
  const handleDrag = (active: number, over: number) => {
    const task = object.tasks[active];

    // TODO(dmaretskyi): Expose batch API properly.
    (object[base] as any)._inBatch(() => {
      object.tasks.splice(active, 1);
      object.tasks.splice(over, 0, task);
    });
  };

  const handleCreateTask = async (task: Task) => {
    object.tasks.push(await space.db.add(task));
  };

  const handleDeleteTask = async (task: Task) => {
    await space.db.remove(task);
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
          id={object.id}
          tasks={object.tasks}
          onCreateItem={handleCreateTask}
          onDeleteItem={handleDeleteTask}
          onMoveItem={handleDrag}
        />
      </div>

      {/* Contacts */}
      {object.team?.length > 0 && (
        <div className='pt-2'>
          <h2 className='pl-2 text-xs'>Team</h2>
          <List aria-labelledby='todo' classNames='mlb-1'>
            {object.team?.map((contact) => (
              <ListItem.Root key={contact.id}>
                <ListItem.Endcap classNames={getSize(6)}>
                  <User className={mx(getSize(4), 'mbs-1')} />
                </ListItem.Endcap>
                <ListItem.Heading classNames='text-sm mbs-0.5'>{contact.name}</ListItem.Heading>
              </ListItem.Root>
            ))}
          </List>
        </div>
      )}
    </div>
  );
};
