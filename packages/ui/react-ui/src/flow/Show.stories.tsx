//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as Button from '../components/Button/Button.tsx';
import * as Toolbar from '../components/Toolbar/Toolbar.tsx';
import { withLayout, withTheme } from '../testing/index.ts';
import * as Show from './Show.tsx';
import * as Switch from './Switch.tsx';

type Task = { title: string };

const ShowStory = () => {
  const [task, setTask] = useState<Task | undefined>();

  return (
    <div className='p-4 flex flex-col gap-4'>
      <Toolbar.Root>
        <Button.Root onClick={() => setTask(task ? undefined : { title: 'Task 1' })}>
          {task ? 'Deselect' : 'Select'}
        </Button.Root>
      </Toolbar.Root>
      <Show.Root when={task} fallback={<p className='text-subdued'>Nothing selected.</p>}>
        {(task) => <p>Selected: {task.title}</p>}
      </Show.Root>
    </div>
  );
};

const SwitchStory = () => {
  const [view, setView] = useState<'list' | 'grid' | 'other'>('list');

  return (
    <div className='p-4 flex flex-col gap-4'>
      <Toolbar.Root>
        <Button.Root onClick={() => setView('list')}>List</Button.Root>
        <Button.Root onClick={() => setView('grid')}>Grid</Button.Root>
        <Button.Root onClick={() => setView('other')}>Other</Button.Root>
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
  title: 'ui/react-ui-core/flow/Show',
  decorators: [withTheme(), withLayout()],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { render: ShowStory };
export const SwitchMatch: Story = { render: SwitchStory };
