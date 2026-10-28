//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { useThemeContext } from '@dxos/react-ui/Theme';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { IdentPlayer } from '../Ident/IdentPlayer.tsx';
import { ComposerIntro, EndOnly, OpenOnly, TAILWIND_HUES, TIMING, loadBrandFont } from '../Ident/index.ts';
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
    <div className='w-56 shrink-0 border-e border-separator p-trim-md flex flex-col gap-1'>
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
} satisfies Record<string, FrameSize>;

type Size = keyof typeof SIZES;

type StoryProps = Pick<
  FrameProps,
  'captionStyle' | 'captionPosition' | 'captionBackground' | 'colors' | 'headerBand' | 'open'
> & {
  /** The recording's aspect ratio, which every view keeps, letterboxed. */
  size?: Size;
  /** Off, the script still steps the app but shows no captions. */
  captions?: boolean;
  /** Milliseconds each caption holds while playing. */
  interval?: number;
  /** Plays the script once and calls this after the last step, instead of looping. */
  onDone?: () => void;
};

/** Plays the script on a loop, as a recording would, with controls to stop and step it. */
const TakeStory = ({
  size = '16:10',
  captionStyle,
  captionPosition,
  captionBackground,
  colors,
  headerBand,
  open,
  captions = true,
  interval = 2_500,
  onDone,
}: StoryProps) => {
  const [step, setStep] = useState(0);
  // Each pass through the script is a new take, so the frame remounts and replays its open title.
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

    const last = step === STEPS.length - 1;
    const timer = setTimeout(() => (last && onDone ? onDone() : setStep((step + 1) % STEPS.length)), interval);
    return () => clearTimeout(timer);
  }, [playing, interval, step, onDone]);

  return (
    <>
      <Frame
        key={take}
        header={HEADER}
        caption={captions ? STEPS[step] : undefined}
        size={SIZES[size]}
        captionStyle={captionStyle}
        captionPosition={captionPosition}
        captionBackground={captionBackground}
        colors={colors}
        headerBand={headerBand}
        open={open}
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

const OPENS = {
  dxos: { component: OpenOnly, seconds: TIMING.open.duration },
  composer: { component: ComposerIntro, seconds: TIMING.composer.duration },
};

type IdentStoryProps = StoryProps & {
  /** The open card: the DXOS title, or the Composer logo (`--ident composer`). */
  openCard?: keyof typeof OPENS;
  /** A Tailwind hue for the ident's logo (and the close card's rule), as `trim-static.mjs --logo-color` takes. */
  logoColor?: string;
};

/** A whole cut, as `trim-static.mjs --ident` assembles it: the open card, the take, then the close card, looped. */
const IdentStory = ({ openCard = 'dxos', size = '16:10', logoColor, ...props }: IdentStoryProps) => {
  const [phase, setPhase] = useState<'open' | 'take' | 'close'>('open');
  // The cards are drawn in the page's theme, as `trim-static.mjs --theme` renders them for a recording.
  const { themeMode } = useThemeContext();
  useEffect(() => loadBrandFont(), []);
  const card = { ...SIZES[size], inputProps: {}, theme: themeMode, logoColor: logoColor || undefined };
  const { component, seconds } = OPENS[openCard];
  switch (phase) {
    case 'open':
      return (
        <IdentPlayer key='open' {...card} component={component} seconds={seconds} onEnded={() => setPhase('take')} />
      );
    case 'take':
      return <TakeStory {...props} size={size} onDone={() => setPhase('close')} />;
    case 'close':
      return (
        <IdentPlayer
          key='close'
          {...card}
          component={EndOnly}
          seconds={TIMING.spot10.endCard}
          onEnded={() => setPhase('open')}
        />
      );
  }
};

/**
 * The frame around a mock autocue take: the title band, the recorded app, and the step captions a flow issues.
 *
 * Test:
 * 1. Every variant keeps the size's aspect ratio (16:10 or 16:9) at any viewport, letterboxed, and the recorded app
 *    fills the whole frame; bands and panels lie over it.
 * 2. The panel at the bottom left: pause stops the script; next steps it by hand.
 * 3. Default: the app alone, no panels. Header: a translucent title band over the top. Footer: a translucent caption band over
 *    the bottom, fading between steps.
 * 4. Floating: the title alone in the centre for 3s, then floating captions, fading between steps.
 * 5. Ident: the DXOS open card, the floating take, then the close card, all at the same 16:10 size, looped; in the light
 *    theme the cards are drawn off-black on off-white; Logo colour recolours the logo and the close card's rule.
 * 6. Footer: the band stays up between steps; only its text fades.
 * 7. Caption: no title; black-on-white floating captions, fading between steps. Position, background and colours
 *    follow their controls as the script plays.
 */
const meta: Meta<typeof TakeStory> = {
  title: 'tools/autocue/Frame',
  render: (args) => <TakeStory {...args} />,
  argTypes: {
    size: { control: 'select', options: Object.keys(SIZES) },
    captionStyle: { control: 'inline-radio', options: ['band', 'panel'] },
    captionPosition: { control: 'inline-radio', options: ['top', 'middle', 'bottom'] },
    captionBackground: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
    colors: { control: 'inline-radio', options: ['white-on-black', 'black-on-white'] },
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof TakeStory>;

/** The recording alone, with no panels. */
export const Default: Story = {
  args: { size: '16:10', captions: false },
};

/** A translucent band over the top carries the take's title. */
export const Header: Story = {
  args: { size: '16:10', headerBand: true, captions: false },
};

/** A translucent band over the bottom carries the step captions. */
export const Footer: Story = {
  args: { size: '16:10', captionStyle: 'band' },
};

/** The title opens alone in the centre, then the step captions float over the frame, at the bottom by default. */
export const Floating: Story = {
  args: {
    size: '16:10',
    open: 3_000,
    captionStyle: 'panel',
    captionPosition: 'bottom',
    captionBackground: 0.6,
    colors: 'white-on-black',
    interval: 4_000,
  },
};

/** The step captions alone, with no title: a floating panel whose position, background and colours are controls. */
export const Caption: Story = {
  args: {
    size: '16:10',
    captionStyle: 'panel',
    captionPosition: 'bottom',
    captionBackground: 0.85,
    colors: 'black-on-white',
    interval: 3_000,
  },
};

/** The floating take, between the DXOS open and close cards. */
export const Ident: StoryObj<typeof IdentStory> = {
  render: (args) => <IdentStory {...args} />,
  args: { size: '16:10', open: 3_000, captionStyle: 'panel', interval: 3_000, openCard: 'dxos', logoColor: 'cyan' },
  argTypes: {
    openCard: { control: 'inline-radio', options: Object.keys(OPENS) },
    logoColor: { control: 'select', options: ['', ...TAILWIND_HUES] },
  },
};
