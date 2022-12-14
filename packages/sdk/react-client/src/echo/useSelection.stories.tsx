//
// Copyright 2022 DXOS.org
//

import React, { useCallback } from 'react';

import { Item, ObjectModel, PublicKey, Space } from '@dxos/client';
import { log } from '@dxos/log';
import { Button } from '@dxos/react-ui';

import { ClientSpaceDecorator, templateForComponent } from '../testing';
import { useSelection } from './useSelection';
import { useSpace } from './useSpaces';

log.config({ filter: 'react-client:debug,warn' });

export default {
  title: 'react-client/useSelection'
};

const TASK_TYPE = 'example:task';
let count = 1;

const Template = ({ spaceKey }: { spaceKey?: PublicKey }) => {
  const space = useSpace(spaceKey);

  const handleAddTask = useCallback(
    () =>
      space?.database.createItem({
        type: TASK_TYPE,
        props: { title: `Todo #${count++}` }
      }),
    [space]
  );

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7' style={{ width: '200px' }}>
      <Button onClick={handleAddTask}>Add Task</Button>
      <hr />
      <TaskList space={space} />
    </main>
  );
};

const TaskList = ({ space }: { space?: Space }) => {
  const { data } = useSelection(space?.database.select({ type: TASK_TYPE }));

  return (
    <ul>
      {data?.map((item) => (
        <Task key={item.id} item={item} />
      ))}
    </ul>
  );
};

const Task = ({ item }: { item: Item<ObjectModel> }) => <li>{item.model.get('title')}</li>;

export const Default = templateForComponent(Template)({});
Default.decorators = [ClientSpaceDecorator({ count: 1 })];

export const Peers = templateForComponent(Template)({});
Peers.decorators = [ClientSpaceDecorator({ count: 4 })];
