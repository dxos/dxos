//
// Copyright 2026 DXOS.org
//

import { Player, type PlayerRef } from '@remotion/player';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { ComposerIntro, EndCard, FPS, OpenTitle, TIMING, loadBrandFont } from '@dxos/ident/cards';
import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { useThemeContext } from '@dxos/react-ui/Theme';
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
} satisfies Record<string, FrameSize>;

type Size = keyof typeof SIZES;

type StoryProps = Pick<FrameProps, 'captionStyle' | 'headerBand' | 'intro'> & {
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
  headerBand,
  intro,
  captions = true,
  interval = 2_500,
  onDone,
}: StoryProps) => {
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

type CardProps = { component: FC; seconds: number; size: Size; onEnded: () => void };

/** One ident card, played once by Remotion's `Player` at the take's size, letterboxed like the take. */
const Card = ({ component, seconds, size, onEnded }: CardProps) => {
  const ref = useRef<PlayerRef>(null);
  const { themeMode } = useThemeContext();
  // The ident is drawn white on black; inverting it (and turning the hues back) gives the light theme's black on white.
  const light = themeMode === 'light';
  useEffect(() => {
    const player = ref.current;
    if (!player) {
      return;
    }

    player.addEventListener('ended', onEnded);
    player.play();
    return () => player.removeEventListener('ended', onEnded);
  }, [onEnded]);

  return (
    <div className={light ? 'dx-fill bg-white' : 'dx-fill bg-black'}>
      <Player
        ref={ref}
        component={component}
        durationInFrames={Math.round(seconds * FPS)}
        fps={FPS}
        compositionWidth={SIZES[size].width}
        compositionHeight={SIZES[size].height}
        style={{ width: '100%', height: '100%', filter: light ? 'invert(1) hue-rotate(180deg)' : undefined }}
        // Muted, since a browser refuses to autoplay sound; the rendered ident keeps its audio.
        initiallyMuted
        acknowledgeRemotionLicense
      />
    </div>
  );
};

const OPENINGS = {
  dxos: { component: OpenTitle, seconds: TIMING.open.duration },
  composer: { component: ComposerIntro, seconds: TIMING.composer.duration },
};

type IdentStoryProps = StoryProps & {
  /** The opening card: the DXOS title, or the Composer logo (`--ident composer`). */
  opening?: keyof typeof OPENINGS;
};

/** A whole cut, as `trim-static.mjs --ident` assembles it: the opening card, the take, then the end card, looped. */
const IdentStory = ({ opening = 'dxos', size = '16:10', ...props }: IdentStoryProps) => {
  const [phase, setPhase] = useState<'open' | 'take' | 'end'>('open');
  useEffect(() => loadBrandFont(), []);
  const { component, seconds } = OPENINGS[opening];
  switch (phase) {
    case 'open':
      return <Card key='open' component={component} seconds={seconds} size={size} onEnded={() => setPhase('take')} />;
    case 'take':
      return <TakeStory {...props} size={size} onDone={() => setPhase('end')} />;
    case 'end':
      return (
        <Card
          key='end'
          component={EndCard}
          seconds={TIMING.spot10.endCard}
          size={size}
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
 * 4. Intro captions: the title alone in the centre for 3s, then floating captions, fading between steps.
 * 5. Ident: the DXOS opening card, the intro-captions take, then the end card, all at the same 16:10 size, looped; in the light
 *    theme the cards are inverted to black on white.
 * 6. Footer: the band stays up between steps; only its text fades.
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

/** The title opens alone in the centre, then the step captions float over the bottom. */
export const IntroCaptions: Story = {
  args: { size: '16:10', intro: 3_000, captionStyle: 'panel', interval: 4_000 },
};

/** The intro-and-captions take, between the DXOS opening card and the end card. */
export const Ident: StoryObj<typeof IdentStory> = {
  render: (args) => <IdentStory {...args} />,
  args: { size: '16:10', intro: 3_000, captionStyle: 'panel', interval: 3_000, opening: 'dxos' },
  argTypes: {
    opening: { control: 'inline-radio', options: Object.keys(OPENINGS) },
  },
};
