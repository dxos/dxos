//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';
import { expect, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as Icon from '@dxos/react-ui/Icon';
import { SIZE_ARG_TYPES, type SizeArgs, withLayout, withSizes, withTheme } from '@dxos/react-ui/testing';

import * as Activity from '../../types/Activity.ts';
import { AttentionGlyph, type AttentionGlyphProps } from './AttentionGlyph.tsx';

/** The `withSizes` row holding the story rendered at `size`. */
const sizeRow = (root: HTMLElement, size: string) => {
  const element = root.querySelector<HTMLElement>(`[data-testid="size-${size}"]`);
  if (!element) {
    throw new Error(`missing size-${size}`);
  }
  return element;
};

const LABELS: Record<Activity.Treatment, string> = {
  'attended': 'Attended',
  'contains-attended': 'Contains attended',
  'busy': 'Busy (tint)',
  'typing': 'Typing',
  'viewers-working': 'Viewers, working',
  'viewers': 'Several viewers',
  'viewer': 'One viewer',
  'agent': 'Agent working',
  'failed': 'Failed',
  'following': 'Following someone',
  'call': 'Live call',
  'working': 'Working',
  'scheduled': 'Scheduled soon',
  'asked': 'Agent asked you',
  'mention': 'Mention or reply',
  'agent-done': 'Agent finished, unread',
  'changed': 'Changed since seen',
  'read-only': 'Read-only',
};

const SLOT_LABELS: Record<Activity.Slot, string> = {
  fill: 'Fill: your attention, then busy work',
  mark: 'Mark: who or what is on it',
  edge: 'Edge: ongoing or steady state',
  corner: 'Corner: something wants you',
};

/** Attention arrives as props rather than treatments; everything else is a treatment. */
const glyphProps = (treatments: readonly Activity.Treatment[]): AttentionGlyphProps => ({
  attended: treatments.includes('attended'),
  containsAttended: treatments.includes('contains-attended'),
  treatments: treatments.filter((treatment) => treatment !== 'attended' && treatment !== 'contains-attended'),
});

const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <section className='flex flex-col gap-2'>
    <h2 className='text-sm text-description'>{title}</h2>
    {children}
  </section>
);

const Row = ({ icon, label, treatments }: { icon: string; label: string; treatments: Activity.Treatment[] }) => (
  <div className='flex items-center gap-2 px-2 py-1 rounded-sm bg-group-surface' data-testid={label}>
    <Icon.Icon icon={icon} />
    <span className='grow truncate'>{label}</span>
    <AttentionGlyph {...glyphProps(treatments)} classNames='mx-1' />
  </div>
);

//
// Vocabulary.
//

const VocabularyStory = () => (
  <Section title='Four slots, at most one treatment each; the number is precedence inside the slot'>
    <div className='grid grid-cols-4 gap-4'>
      {Activity.Slots.map((slot) => (
        <div key={slot} className='flex flex-col gap-2 p-3 rounded-md bg-group-surface' data-testid={`slot-${slot}`}>
          <h3 className='text-sm'>{SLOT_LABELS[slot]}</h3>
          {Activity.Treatments[slot].map((treatment, index) => (
            <div key={treatment} className='flex items-center gap-2 text-sm' data-testid={treatment}>
              <span className='w-3 text-xs text-description'>{index + 1}</span>
              <AttentionGlyph {...glyphProps([treatment])} classNames='mx-1' />
              <span>{LABELS[treatment]}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  </Section>
);

//
// Resolution.
//

const RESOLUTIONS: { slot: Activity.Slot; requested: Activity.Treatment[] }[] = [
  { slot: 'fill', requested: ['busy', 'attended'] },
  { slot: 'mark', requested: ['agent', 'viewer', 'viewers'] },
  { slot: 'edge', requested: ['working', 'call', 'failed'] },
  { slot: 'corner', requested: ['changed', 'read-only', 'asked'] },
];

const ResolutionStory = () => (
  <Section title='Resolving a slot: the winner renders, the rest go to the tooltip'>
    <div className='grid grid-cols-[6rem_auto_2rem_1fr] items-center gap-x-4 gap-y-2 text-sm'>
      {RESOLUTIONS.map(({ slot, requested }) => {
        const winner = Activity.resolve(requested)[slot];
        return (
          <React.Fragment key={slot}>
            <span className='capitalize text-description'>{slot}</span>
            <div className='flex items-center gap-1'>
              {requested.map((treatment) => (
                <AttentionGlyph
                  key={treatment}
                  {...glyphProps([treatment])}
                  classNames={['mx-1', treatment !== winner && 'opacity-40']}
                />
              ))}
            </div>
            <Icon.Icon icon='ph--arrow-right--regular' />
            <div className='flex items-center gap-2'>
              <AttentionGlyph {...glyphProps(requested)} classNames='mx-1' data-testid={`resolved-${slot}`} />
              <span>{winner && LABELS[winner]} wins</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  </Section>
);

//
// Combinations.
//

const COMBINATIONS: { icon: string; label: string; caption: string; treatments: Activity.Treatment[] }[] = [
  { icon: 'ph--file-text--regular', label: 'Meeting notes', caption: 'Nothing happening', treatments: [] },
  { icon: 'ph--file-text--regular', label: 'Roadmap', caption: 'Attended', treatments: ['attended'] },
  {
    icon: 'ph--folder--regular',
    label: 'Q4 planning',
    caption: 'Contains attended',
    treatments: ['contains-attended'],
  },
  { icon: 'ph--file-text--regular', label: 'Design brief', caption: 'One viewer', treatments: ['viewer'] },
  { icon: 'ph--file-text--regular', label: 'Launch plan', caption: 'Several viewers', treatments: ['viewers'] },
  {
    icon: 'ph--sparkle--regular',
    label: 'Chat: summarise launch',
    caption: 'Assistant working',
    treatments: ['agent'],
  },
  {
    icon: 'ph--file-text--regular',
    label: 'Launch plan',
    caption: 'Companion finished, unread',
    treatments: ['viewers', 'agent-done'],
  },
  {
    icon: 'ph--sparkle--regular',
    label: 'Chat: book travel',
    caption: 'Agent and asked you',
    treatments: ['agent', 'asked'],
  },
  {
    icon: 'ph--file-text--regular',
    label: 'Roadmap',
    caption: 'Attended, viewer, working',
    treatments: ['attended', 'viewer', 'working'],
  },
  {
    icon: 'ph--video--regular',
    label: 'Standup notes',
    caption: 'Viewers, live call, mention',
    treatments: ['viewers', 'call', 'mention'],
  },
  {
    icon: 'ph--folder--regular',
    label: 'Q4 planning',
    caption: 'Contains attended, failed',
    treatments: ['contains-attended', 'failed'],
  },
  {
    icon: 'ph--file-text--regular',
    label: 'Spec v2',
    caption: 'One of each slot',
    treatments: ['attended', 'typing', 'following', 'changed'],
  },
];

const CombinationsStory = () => (
  <Section title='Across slots: any one from each'>
    <div className='grid grid-cols-3 gap-x-4 gap-y-3'>
      {COMBINATIONS.map(({ icon, label, caption, treatments }) => (
        <div key={caption} className='flex flex-col gap-1'>
          <Row icon={icon} label={label} treatments={treatments} />
          <span className='px-1 text-xs text-description'>{caption}</span>
        </div>
      ))}
    </div>
  </Section>
);

//
// Motion.
//

const MOTIONS: { caption: string; label: string; icon: string; treatments: Activity.Treatment[] }[] = [
  {
    caption: 'Typing moves; nothing competes',
    icon: 'ph--file-text--regular',
    label: 'Spec v2',
    treatments: ['attended', 'typing', 'following', 'changed'],
  },
  {
    caption: 'Asked you moves; the sparkle holds still',
    icon: 'ph--sparkle--regular',
    label: 'Chat: book travel',
    treatments: ['agent', 'working', 'asked'],
  },
  {
    caption: 'The edge never moves, so typing does',
    icon: 'ph--file-text--regular',
    label: 'Launch plan',
    treatments: ['typing', 'working'],
  },
  {
    caption: 'Busy dots move inside a working edge',
    icon: 'ph--file-text--regular',
    label: 'Launch plan',
    treatments: ['viewers-working', 'working'],
  },
  {
    caption: 'A still mark lets the busy fill move',
    icon: 'ph--robot--regular',
    label: 'Triage agent',
    treatments: ['busy', 'viewer', 'failed'],
  },
];

const MotionStory = () => (
  <Section title='One thing moves: corner, then mark, then fill; the edge stays still'>
    <div className='grid grid-cols-[1fr_16rem] items-center gap-x-4 gap-y-2 text-sm'>
      {MOTIONS.map(({ caption, label, icon, treatments }) => (
        <React.Fragment key={caption}>
          <span className='text-description'>{caption}</span>
          <Row icon={icon} label={label} treatments={treatments} />
        </React.Fragment>
      ))}
    </div>
  </Section>
);

//
// Agent session.
//

const AGENT_STATES: { title: string; treatments: Activity.Treatment[] }[] = [
  { title: 'Idle, one viewer', treatments: ['viewer'] },
  { title: 'Agent working', treatments: ['viewer', 'agent'] },
  { title: 'Finished, unread', treatments: ['viewer', 'agent-done'] },
  { title: 'Read', treatments: ['viewer'] },
];

const AgentSessionStory = () => (
  <Section title='An agent session: the star replaces presence while it works, then marks the corner until read'>
    <div className='grid grid-cols-[8rem_repeat(4,minmax(0,1fr))] items-center gap-x-3 gap-y-2 text-sm'>
      <span />
      {AGENT_STATES.map(({ title }) => (
        <span key={title} className='text-description'>
          {title}
        </span>
      ))}
      <span className='text-description'>Elsewhere</span>
      {AGENT_STATES.map(({ title, treatments }) => (
        <Row key={title} icon='ph--sparkle--regular' label='Trip ideas' treatments={treatments} />
      ))}
      <span className='text-description'>Open</span>
      {AGENT_STATES.map(({ title, treatments }) => (
        <Row key={title} icon='ph--sparkle--regular' label='Trip ideas' treatments={['attended', ...treatments]} />
      ))}
    </div>
  </Section>
);

const AllStory = () => (
  <div className='flex flex-col gap-8 p-4'>
    <VocabularyStory />
    <ResolutionStory />
    <CombinationsStory />
    <MotionStory />
    <AgentSessionStory />
  </div>
);

//
// Sizes.
//

type SizeStoryArgs = SizeArgs & Pick<AttentionGlyphProps, 'attended' | 'containsAttended'>;

const SizesStory = ({ attended, containsAttended }: SizeStoryArgs) => (
  <div className='flex items-center gap-4'>
    <AttentionGlyph {...{ attended, containsAttended }} data-testid='none' />
    <AttentionGlyph {...{ attended, containsAttended }} treatments={['viewer']} data-testid='viewer' />
    <AttentionGlyph {...{ attended, containsAttended }} treatments={['viewers']} data-testid='viewers' />
    <AttentionGlyph attended treatments={['viewer']} data-testid='attended' />
    <AttentionGlyph containsAttended data-testid='contains' />
    <AttentionGlyph treatments={['viewers', 'working', 'asked']} data-testid='busy' />
  </div>
);

const meta: Meta = {
  title: 'ui/react-ui-core/components/AttentionGlyph',
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj;

/** Everything the glyph can draw: the vocabulary, how slots resolve, combinations and the motion rule. */
export const Default: StoryObj<SizeArgs> = {
  render: AllStory,
  decorators: [withSizes()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'fullscreen' },
};

export const Vocabulary: Story = {
  render: () => (
    <div className='p-4 w-[56rem]'>
      <VocabularyStory />
    </div>
  ),
};

export const Resolution: Story = {
  render: () => (
    <div className='p-4 w-[40rem]'>
      <ResolutionStory />
    </div>
  ),
};

export const Combinations: Story = {
  render: () => (
    <div className='p-4 w-[56rem]'>
      <CombinationsStory />
    </div>
  ),
};

export const AgentStar: StoryObj<SizeArgs> = {
  render: () => (
    <div className='p-4'>
      <AgentSessionStory />
    </div>
  ),
  decorators: [withSizes()],
  args: { size: 'xl' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'fullscreen' },
};

export const Motion: Story = {
  render: () => (
    <div className='p-4 w-[40rem]'>
      <MotionStory />
    </div>
  ),
};

export const Sizes: StoryObj<SizeStoryArgs> = {
  render: SizesStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[24rem]' })],
  args: { size: 'md', attended: false, containsAttended: false },
  argTypes: SIZE_ARG_TYPES,
};

/** The glyph is 3/4 of the icon size; attention colours its fill, and activity draws one treatment per slot. */
export const Test: StoryObj<SizeStoryArgs> = {
  ...Sizes,
  args: { ...Sizes.args, allSizes: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const rest = canvas.getByTestId('none');
    await expect(rest.getBoundingClientRect().width).toBe(12);
    await expect(rest.getBoundingClientRect().height).toBe(12);
    await expect(within(sizeRow(canvasElement, 'xl')).getByTestId('none').getBoundingClientRect().width).toBe(18);
    await expect(rest.childElementCount).toBe(0);

    // Marks are decorative; one and several viewers draw different marks.
    const one = canvas.getByTestId('viewer').querySelector('svg');
    const many = canvas.getByTestId('viewers').querySelector('svg');
    await expect(one).toHaveAttribute('aria-hidden', 'true');
    await expect(one?.innerHTML).not.toBe(many?.innerHTML);

    // Attended fills with the accent; containing the attended item tints; at rest it is transparent.
    const background = (testId: string) => getComputedStyle(canvas.getByTestId(testId)).backgroundColor;
    await expect(background('none')).toBe('rgba(0, 0, 0, 0)');
    await expect(background('attended')).not.toBe('rgba(0, 0, 0, 0)');
    await expect(background('contains')).not.toBe('rgba(0, 0, 0, 0)');
    await expect(background('contains')).not.toBe(background('attended'));

    // Every slot draws at once, and only the corner (asked) animates.
    const busy = canvas.getByTestId('busy');
    await expect(busy).toHaveAttribute('data-moving', 'corner');
    await expect(busy.querySelector('[data-part="edge"]')).not.toBeNull();
    await expect(busy.querySelector('[data-part="mark"]')).not.toBeNull();
    const corner = busy.querySelector<SVGElement>('[data-part="corner"]');
    const edge = busy.querySelector<SVGElement>('[data-part="edge"]');
    await expect(corner ? getComputedStyle(corner).animationName : '').toBe('dx-attention-glyph-pulse');
    await expect(edge ? getComputedStyle(edge).animationName : '').toBe('none');
  },
};
