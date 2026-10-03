//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as Button from '../next/components/Button/Button.tsx';
import * as Toolbar from '../next/components/Toolbar/Toolbar.tsx';
import { withLayout, withTheme } from '../testing/index.ts';
import * as Match from './Match.tsx';
import * as Show from './Show.tsx';

type Task = { title: string };

const ShowStory = () => {
  const [task, setTask] = useState<Task | undefined>();

  return (
    <div className='p-4 flex flex-col gap-4'>
      <Toolbar.Root>
        <Button.Button onClick={() => setTask(task ? undefined : { title: 'Task 1' })}>
          {task ? 'Deselect' : 'Select'}
        </Button.Button>
      </Toolbar.Root>
      <Show.Show when={task} fallback={<p className='text-fg-subtle'>Nothing selected.</p>}>
        {(task) => <p>Selected: {task.title}</p>}
      </Show.Show>
    </div>
  );
};

const MatchStory = () => {
  const [view, setView] = useState<'list' | 'grid' | 'other'>('list');

  return (
    <div className='p-4 flex flex-col gap-4'>
      <Toolbar.Root>
        <Button.Button onClick={() => setView('list')}>List</Button.Button>
        <Button.Button onClick={() => setView('grid')}>Grid</Button.Button>
        <Button.Button onClick={() => setView('other')}>Other</Button.Button>
      </Toolbar.Root>
      <Match.Root on={view} fallback={<p className='text-fg-subtle'>No view.</p>}>
        <Match.Case when='list'>
          <ul className='list-disc ps-6'>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </Match.Case>
        <Match.Case when='grid'>
          <div className='grid grid-cols-2 gap-2'>
            <div className='border border-separator p-2'>Item 1</div>
            <div className='border border-separator p-2'>Item 2</div>
          </div>
        </Match.Case>
      </Match.Root>
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
export const MatchCase: Story = { render: MatchStory };
