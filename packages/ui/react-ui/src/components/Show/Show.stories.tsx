//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { Button } from '../Button';
import { Toolbar } from '../Toolbar';
import { Show } from './Show';
import { Switch } from './Switch';

type Task = { title: string };

const ShowStory = () => {
  const [task, setTask] = useState<Task | undefined>();

  return (
    <div className='p-4 flex flex-col gap-4'>
      <Toolbar.Root>
        <Button onClick={() => setTask(task ? undefined : { title: 'Task 1' })}>{task ? 'Deselect' : 'Select'}</Button>
      </Toolbar.Root>
      <Show when={task} fallback={<p className='text-subdued'>Nothing selected.</p>}>
        {(task) => <p>Selected: {task.title}</p>}
      </Show>
    </div>
  );
};

const SwitchStory = () => {
  const [view, setView] = useState<'list' | 'grid' | 'other'>('list');

  return (
    <div className='p-4 flex flex-col gap-4'>
      <Toolbar.Root>
        <Button onClick={() => setView('list')}>List</Button>
        <Button onClick={() => setView('grid')}>Grid</Button>
        <Button onClick={() => setView('other')}>Other</Button>
      </Toolbar.Root>
      <Switch.Root on={view} fallback={<p className='text-subdued'>No view.</p>}>
        <Switch.Match when='list'>
          <ul className='list-disc ps-6'>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </Switch.Match>
        <Switch.Match when='grid'>
          <div className='grid grid-cols-2 gap-2'>
            <div className='border border-separator p-2'>Item 1</div>
            <div className='border border-separator p-2'>Item 2</div>
          </div>
        </Switch.Match>
      </Switch.Root>
    </div>
  );
};

//
// Meta
//

const meta: Meta = {
  title: 'ui/react-ui-core/components/Show',
  decorators: [withTheme(), withLayout()],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: ShowStory };
export const SwitchMatch: Story = { render: SwitchStory };
