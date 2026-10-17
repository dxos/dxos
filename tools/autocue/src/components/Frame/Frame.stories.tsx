//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type FrameSize, type FrameText } from './create-frame.ts';
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

/** The bar react-ui-canvas's toolbars sit in, so the story's controls match them. */
const PANEL = 'gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator';

/** The recording sizes a take is rendered at: the driver's default viewport, and the ident's 1080p. */
const SIZES = {
  '16:10': { width: 1280, height: 800 },
  '16:9': { width: 1920, height: 1080 },
  'fill': undefined,
} satisfies Record<string, FrameSize | undefined>;

type StoryProps = Pick<FrameProps, 'mode' | 'captionStyle' | 'headerBand' | 'intro'> & {
  /** Layout only: the recording's aspect ratio, or fill the viewport. */
  size?: keyof typeof SIZES;
  /** Milliseconds each caption holds while playing. */
  interval?: number;
};

/** Plays the script on a loop, as a recording would, with controls to stop and step it. */
const TakeStory = ({ mode, size = '16:10', captionStyle, headerBand, intro, interval = 2_500 }: StoryProps) => {
  const [step, setStep] = useState(0);
  // Each pass through the script is a new take, so the frame remounts and replays its intro.
  const [take, setTake] = useState(0);
  const previous = useRef(step);
  useEffect(() => {
    if (step === 0 && previous.current !== 0) {
      setTake((take) => take + 1);
    }
    previous.current = step;
  }, [step]);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing) {
      return;
    }

    const timer = setInterval(() => setStep((step) => (step + 1) % STEPS.length), interval);
    return () => clearInterval(timer);
  }, [playing, interval]);

  return (
    <>
      <Frame
        key={take}
        mode={mode}
        header={HEADER}
        caption={STEPS[step]}
        size={SIZES[size]}
        captionStyle={captionStyle}
        headerBand={headerBand}
        intro={intro}
      >
        <MockApp step={step} />
      </Frame>
      {/* Outside the frame: story chrome, not part of the recording, so it is neither scaled nor letterboxed. */}
      <div className='fixed left-3 bottom-3 z-10'>
        <Toolbar.Root classNames={PANEL}>
          <Button.Root
            variant='ghost'
            iconOnly
            icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
            label={playing ? 'Pause' : 'Play'}
            onClick={() => setPlaying((playing) => !playing)}
          />
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--caret-right--regular'
            label='Next step'
            disabled={playing}
            onClick={() => setStep((step) => (step + 1) % STEPS.length)}
          />
          <span className='px-1 text-sm text-fg-muted tabular-nums' data-testid='frame-step'>
            {step + 1} / {STEPS.length}
          </span>
        </Toolbar.Root>
      </div>
    </>
  );
};

/**
 * The frame around a mock autocue take: the title band, the recorded app, and the step captions a flow issues.
 *
 * Test:
 * 1. The caption changes every 2.5s and is gone on the last step; the title band stays.
 * 2. The floating panel (bottom left): pause stops the script; next steps it by hand.
 * 3. Size 16:10 and 16:9 keep that aspect ratio at any viewport, letterboxed; fill takes the whole viewport.
 * 4. The header is a full-width band. The caption is a floating panel as wide as its text, at a fixed height;
 *    Bands makes it span the width too.
 * 5. Intro shows the title alone as a large centred panel for 3s at the start of each take; with no header band
 *    the whole frame is the recording.
 * The recorded app always lays out at the frame's size (the same viewport); a band scales it down to fit.
 * 6. Overlay pins the header band and floats the caption over the app, as the driver paints them into a recorded page.
 */
const meta: Meta<typeof TakeStory> = {
  title: 'tools/autocue/Frame',
  render: (args) => <TakeStory {...args} />,
  argTypes: {
    size: { control: 'select', options: Object.keys(SIZES) },
    captionStyle: { control: 'inline-radio', options: ['band', 'panel'] },
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof TakeStory>;

export const Default: Story = {
  args: { mode: 'layout', size: '16:10' },
};

export const Bands: Story = {
  args: { mode: 'layout', size: '16:10', captionStyle: 'band' },
};

export const Intro: Story = {
  args: { mode: 'layout', size: '16:10', headerBand: false, intro: 3_000, interval: 4_000 },
};

export const Overlay: Story = {
  args: { mode: 'overlay' },
};
