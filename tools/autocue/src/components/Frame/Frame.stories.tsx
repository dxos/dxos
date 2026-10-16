//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type FrameText } from './create-frame.ts';
import { Frame, type FrameProps } from './Frame.tsx';

/** One take's script, as a flow would issue it: each step is a `caption` op; the last clears it. */
const STEPS: (FrameText | undefined)[] = [
  { title: 'Open the projects plugin', subtitle: 'Every space lists its projects in the sidebar' },
  { title: 'Create a project', subtitle: 'Name it and pick the space it lives in' },
  { title: 'Add a task' },
  { title: 'Drag the task to In progress', subtitle: 'The board updates for everyone in the space' },
  undefined,
];

const HEADER: FrameText = { title: 'Projects', subtitle: 'Track work across spaces' };

const TASKS = ['Write the brief', 'Record the demo', 'Review the cut', 'Publish'];

/** The board column a task sits in at a step, or -1 before the tasks are added. */
const columnOf = (step: number, task: number) => (step < 2 ? -1 : step >= 3 && task === 0 ? 1 : 0);

/** A stand-in for the recorded app: enough of Composer's shape that the bands read against something real. */
const MockApp = ({ step }: { step: number }) => (
  <div className='flex dx-grow bg-base-surface text-base-fg'>
    <div className='w-56 shrink-0 border-e border-separator p-3 flex flex-col gap-1'>
      {['Inbox', 'Projects', 'Documents', 'Sketches'].map((item) => (
        <div
          key={item}
          className={item === 'Projects' && step >= 0 ? 'px-2 py-1 rounded-sm bg-active-surface' : 'px-2 py-1'}
        >
          {item}
        </div>
      ))}
    </div>
    <div className='flex-1 grid grid-cols-3 gap-3 p-4 content-start'>
      {['Backlog', 'In progress', 'Done'].map((column, index) => (
        <div key={column} className='flex flex-col gap-2 p-2 rounded-sm border border-separator'>
          <div className='text-sm text-fg-muted'>{column}</div>
          {TASKS.filter((_, task) => columnOf(step, task) === index).map((task) => (
            <div key={task} className='px-2 py-1.5 rounded-sm bg-modal-surface border border-separator'>
              {task}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

type StoryProps = Pick<FrameProps, 'mode'> & {
  /** Milliseconds each caption holds while playing. */
  interval?: number;
};

/** Plays the script on a loop, as a recording would, with controls to stop and step it. */
const TakeStory = ({ mode, interval = 2_500 }: StoryProps) => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) {
      return;
    }

    const timer = setInterval(() => setStep((step) => (step + 1) % STEPS.length), interval);
    return () => clearInterval(timer);
  }, [playing, interval]);

  return (
    <div className='flex flex-col dx-fill'>
      <Toolbar.Root>
        <Button.Root onClick={() => setPlaying((playing) => !playing)}>{playing ? 'Pause' : 'Play'}</Button.Root>
        <Button.Root disabled={playing} onClick={() => setStep((step) => (step + 1) % STEPS.length)}>
          Next
        </Button.Root>
        <span className='text-sm text-fg-muted'>
          Step {step + 1} / {STEPS.length}
        </span>
      </Toolbar.Root>
      <Frame mode={mode} header={HEADER} caption={STEPS[step]}>
        <MockApp step={step} />
      </Frame>
    </div>
  );
};

/**
 * The frame around a mock autocue take: the title band, the recorded app, and the step captions a flow issues.
 *
 * Test:
 * 1. The caption changes every 2.5s and is gone on the last step; the title band stays.
 * 2. Pause stops the script; Next steps it by hand.
 * 3. Overlay pins both bands to the window edges over the app, as the driver paints them into a recorded page.
 */
const meta: Meta<typeof TakeStory> = {
  title: 'tools/autocue/Frame',
  render: (args) => <TakeStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof TakeStory>;

export const Default: Story = {
  args: { mode: 'layout' },
};

export const Overlay: Story = {
  args: { mode: 'overlay' },
};
