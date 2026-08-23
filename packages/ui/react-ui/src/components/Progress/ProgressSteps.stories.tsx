//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { Panel } from '../Panel';
import { Toolbar } from '../Toolbar';
import { Progress } from './Progress';
import { type ProgressStepsProps } from './ProgressSteps';
import { type ProgressStep } from './types';

const createStep = (index: number): ProgressStep => ({ id: `step-${index}`, label: `Step ${index + 1}` });

const appendStep = (steps: ProgressStep[]): ProgressStep[] => [...steps, createStep(steps.length)];

type StoryArgs = Partial<ProgressStepsProps>;

/**
 * Drives an unbounded run: steps arrive one at a time and the chain anchors on the tail, so the step
 * in flight stays visible however long the plan grows.
 *
 * The run starts empty — every step on screen was put there by **Add** or by **Start**, so what the
 * chain draws is only ever what the story asked for.
 */
const DefaultStory = (props: StoryArgs) => {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [selected, setSelected] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = setInterval(() => setSteps(appendStep), 1_500);
    return () => clearInterval(interval);
  }, [running]);

  const handleAdd = useCallback(() => setSteps(appendStep), []);

  const handleClear = useCallback(() => {
    setRunning(false);
    setSteps([]);
    setSelected(undefined);
  }, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={() => setRunning(true)}>Start</Toolbar.Button>
          <Toolbar.Button onClick={() => setRunning(false)}>Stop</Toolbar.Button>
          <Toolbar.Button onClick={handleAdd}>Add</Toolbar.Button>
          <Toolbar.Button onClick={handleClear}>Clear</Toolbar.Button>
          <div className='flex-1' />
          <div className='p-2 text-subdued'>{steps.length}</div>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content />
      <Panel.Statusbar asChild>
        <Progress.Steps
          classNames='w-full h-8'
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
 *
 * **Add** appends a single step. **Start** appends one every 1.5s — keep it running past the width
 * of the panel to watch the head close rather than the whole chain shrink.
 */
export const Default: Story = {};
