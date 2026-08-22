//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { Panel } from '../Panel';
import { Toolbar } from '../Toolbar';

import { Progress } from './Progress';
import { type ProgressStepsProps } from './ProgressSteps';
import { type ProgressStep } from './types';

const createStep = (index: number): ProgressStep => ({ id: `step-${index}`, label: `Step ${index + 1}` });

type StoryArgs = Partial<ProgressStepsProps> & {
  /** Steps the run starts with; further ones are appended while it runs. */
  steps?: number;
};

/**
 * Drives an unbounded run: steps arrive one at a time and the chain anchors on the tail, so the step
 * in flight stays visible however long the plan grows.
 */
const DefaultStory = ({ steps: initial = 3, ...props }: StoryArgs) => {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>(() => Array.from({ length: initial }, (_, i) => createStep(i)));
  const [selected, setSelected] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = setInterval(() => setSteps((steps) => [...steps, createStep(steps.length)]), 1_500);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setRunning(true)}>Start</Toolbar.Button>
          <Toolbar.Button onClick={() => setRunning(false)}>Stop</Toolbar.Button>
          <Toolbar.Button onClick={() => setSteps((steps) => [...steps, createStep(steps.length)])}>Add</Toolbar.Button>
          <Toolbar.Button onClick={() => setSteps([])}>Clear</Toolbar.Button>
          <div className='flex-1' />
          <div className='p-2 text-subdued'>{steps.length}</div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content />
      <Panel.Statusbar asChild>
        <Progress.Steps
          classNames='w-full h-8 px-2'
          state={{ phases: steps, phase: steps.length - 1, status: running ? 'running' : 'done' }}
          selected={selected}
          onSelect={(step) => setSelected((selected) => (selected === step.index ? undefined : step.index))}
          {...props}
        />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Progress/Steps',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The chain on its own: one circle per step, the one in flight ringed, and a click selects one.
 * Only the tail that fits is drawn — press **Start** and watch the head close rather than the whole
 * chain shrink.
 */
export const Default: Story = {
  args: {
    steps: 3,
  },
};
