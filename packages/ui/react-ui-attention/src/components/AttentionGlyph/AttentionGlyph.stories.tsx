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

/** Attention is not a treatment: the glyph takes it as props. */
type AttentionName = 'attended' | 'contains-attended';

type Example = {
  readonly label: string;
  /** What produces it in the app today; examples without one only show what a treatment can describe. */
  readonly source?: string;
  readonly treatment: Activity.Treatment;
};

/** Treatments in use, then examples of what other activity could draw. */
const EXAMPLES = {
  'viewer': {
    label: 'One viewer',
    source: 'presence',
    treatment: { slot: 'mark', icon: 'dot', hue: 'primary', priority: 10 },
  },
  'viewers': {
    label: 'Several viewers',
    source: 'presence',
    treatment: { slot: 'mark', icon: 'dots', hue: 'primary', priority: 10 },
  },
  'agent': {
    label: 'Agent working',
    source: 'assistant',
    treatment: { slot: 'mark', icon: 'star', priority: 30, animate: true },
  },
  'agent-done': {
    label: 'Agent finished, unread',
    source: 'assistant',
    treatment: { slot: 'mark', icon: 'star', hue: 'amber', priority: 20 },
  },
  'editing': {
    label: 'Someone editing',
    treatment: { slot: 'mark', icon: 'ph--pencil-simple--fill', priority: 15, animate: true },
  },
  'warning': {
    label: 'Needs a fix',
    treatment: { slot: 'mark', icon: 'ph--warning--fill', hue: 'warning', priority: 25 },
  },
  'busy': {
    label: 'Busy',
    treatment: { slot: 'fill', hue: 'amber', priority: 10, animate: true },
  },
  'pinned': {
    label: 'Pinned',
    treatment: { slot: 'fill', hue: 'violet', opacity: 0.4, priority: 20 },
  },
  'failed': { label: 'Failed', treatment: { slot: 'edge', hue: 'error', priority: 40 } },
  'following': { label: 'Following someone', treatment: { slot: 'edge', hue: 'violet', priority: 30 } },
  'call': { label: 'Live call', treatment: { slot: 'edge', hue: 'green', priority: 20 } },
  'working': { label: 'Working', treatment: { slot: 'edge', hue: 'amber', priority: 10 } },
  'scheduled': { label: 'Scheduled soon', treatment: { slot: 'edge', hue: 'teal', dashed: true, priority: 0 } },
  'asked': {
    label: 'Agent asked you',
    treatment: { slot: 'corner', hue: 'amber', priority: 40, animate: true },
  },
  'mention': { label: 'Mention or reply', treatment: { slot: 'corner', hue: 'rose', priority: 30 } },
  'changed': { label: 'Changed since seen', treatment: { slot: 'corner', hue: 'primary', priority: 20 } },
  'read-only': {
    label: 'Read-only',
    treatment: { slot: 'corner', hue: 'neutral', shape: 'ring', priority: 10 },
  },
} satisfies Record<string, Example>;

type ExampleName = keyof typeof EXAMPLES;

type Name = AttentionName | ExampleName;

const isAttention = (name: Name): name is AttentionName => name === 'attended' || name === 'contains-attended';

const nameLabel = (name: Name) =>
  name === 'attended' ? 'Attended' : name === 'contains-attended' ? 'Contains attended' : EXAMPLES[name].label;

const treatmentsOf = (names: readonly Name[]): Activity.Treatment[] =>
  names.flatMap((name) => (isAttention(name) ? [] : [EXAMPLES[name].treatment]));

const glyphProps = (names: readonly Name[]): AttentionGlyphProps => ({
  attended: names.includes('attended'),
  containsAttended: names.includes('contains-attended'),
  treatments: treatmentsOf(names),
});

const SLOT_LABELS: Record<Activity.Slot, string> = {
  fill: 'Fill: a hue and its opacity, under attention',
  mark: 'Mark: a built-in shape or any icon, in a hue',
  edge: 'Edge: a hue, solid or dashed',
  corner: 'Corner: a hue, as a dot or a ring',
};

const Section = ({ title, children }: PropsWithChildren<{ title: string }>) => (
  <section className='flex flex-col gap-2'>
    <h2 className='text-sm text-description'>{title}</h2>
    {children}
  </section>
);

const Row = ({ icon, label, treatments }: { icon: string; label: string; treatments: Name[] }) => (
  <div className='flex items-center gap-2 px-2 py-1 rounded-sm bg-group-surface' data-testid={label}>
    <Icon.Icon icon={icon} />
    <span className='grow truncate'>{label}</span>
    <AttentionGlyph {...glyphProps(treatments)} classNames='mx-1' />
  </div>
);

//
// Examples.
//

const ExamplesStory = () => (
  <Section title='Each treatment describes how it draws; in use first, then examples. The number is its priority'>
    <div className='grid grid-cols-4 gap-4'>
      {Activity.Slots.map((slot) => (
        <div key={slot} className='flex flex-col gap-2 p-3 rounded-md bg-group-surface' data-testid={`slot-${slot}`}>
          <h3 className='text-sm'>{SLOT_LABELS[slot]}</h3>
          {Object.entries<Example>(EXAMPLES)
            .filter(([, example]) => example.treatment.slot === slot)
            .map(([name, example]) => (
              <div key={name} className='flex items-center gap-2 text-sm' data-testid={name}>
                <span className='w-4 text-xs text-description'>{example.treatment.priority}</span>
                <AttentionGlyph treatments={[example.treatment]} classNames='mx-1' />
                <span className='grow'>{example.label}</span>
                {example.source && <span className='text-xs text-description'>{example.source}</span>}
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

const RESOLUTIONS: { slot: Activity.Slot; requested: Name[] }[] = [
  { slot: 'fill', requested: ['busy', 'attended'] },
  { slot: 'mark', requested: ['agent', 'viewer', 'viewers'] },
  { slot: 'edge', requested: ['working', 'call', 'failed'] },
  { slot: 'corner', requested: ['changed', 'read-only', 'asked'] },
];

const ResolutionStory = () => (
  <Section title='Resolving a slot: the winner renders, the rest go to the tooltip'>
    <div className='grid grid-cols-[6rem_auto_2rem_1fr] items-center gap-x-4 gap-y-2 text-sm'>
      {RESOLUTIONS.map(({ slot, requested }) => {
        const { attended, containsAttended, treatments = [] } = glyphProps(requested);
        const resolved = Activity.resolve(treatments, { attention: attended || containsAttended })[slot];
        const winner = requested.find((name) =>
          isAttention(name) ? slot === 'fill' && !resolved : EXAMPLES[name].treatment === resolved,
        );
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
              <span>{winner && nameLabel(winner)} wins</span>
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

const COMBINATIONS: { icon: string; label: string; caption: string; treatments: Name[] }[] = [
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
    treatments: ['agent-done'],
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
    treatments: ['attended', 'editing', 'following', 'changed'],
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

const MOTIONS: { caption: string; label: string; icon: string; treatments: Name[] }[] = [
  {
    caption: 'Editing moves; nothing competes',
    icon: 'ph--file-text--regular',
    label: 'Spec v2',
    treatments: ['attended', 'editing', 'following', 'changed'],
  },
  {
    caption: 'Asked you moves; the sparkle holds still',
    icon: 'ph--sparkle--regular',
    label: 'Chat: book travel',
    treatments: ['agent', 'working', 'asked'],
  },
  {
    caption: 'The edge never moves, so editing does',
    icon: 'ph--file-text--regular',
    label: 'Launch plan',
    treatments: ['editing', 'working'],
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

/** Opening a chat reads its finished turn, so only a chat nobody has open stays unread. */
const AGENT_VIEWERS: { title: string; treatments: Name[] }[] = [
  { title: 'Nobody', treatments: [] },
  { title: 'Someone else', treatments: ['viewer'] },
  { title: 'You', treatments: ['attended'] },
];

const AGENT_STATES: { title: string; treatments: (open: boolean) => Name[] }[] = [
  { title: 'Idle', treatments: () => [] },
  { title: 'Agent working', treatments: () => ['agent'] },
  { title: 'Turn finished', treatments: (open) => (open ? [] : ['agent-done']) },
];

const AgentSessionStory = () => (
  <Section title='An agent session: the star pulses while it works, then turns amber until anyone opens the chat'>
    <div className='grid grid-cols-[8rem_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-2 text-sm'>
      <span className='text-description'>Open by</span>
      {AGENT_STATES.map(({ title }) => (
        <span key={title} className='text-description'>
          {title}
        </span>
      ))}
      {AGENT_VIEWERS.map((viewers) => (
        <React.Fragment key={viewers.title}>
          <span className='text-description'>{viewers.title}</span>
          {AGENT_STATES.map((state) => (
            <Row
              key={state.title}
              icon='ph--sparkle--regular'
              label='Trip ideas'
              treatments={[...viewers.treatments, ...state.treatments(viewers.treatments.length > 0)]}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  </Section>
);

const AllStory = () => (
  <div className='flex flex-col gap-8 p-4'>
    <ExamplesStory />
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
    <AttentionGlyph {...{ attended, containsAttended }} treatments={treatmentsOf(['viewer'])} data-testid='viewer' />
    <AttentionGlyph {...{ attended, containsAttended }} treatments={treatmentsOf(['viewers'])} data-testid='viewers' />
    <AttentionGlyph attended treatments={treatmentsOf(['viewer'])} data-testid='attended' />
    <AttentionGlyph containsAttended data-testid='contains' />
    <AttentionGlyph treatments={treatmentsOf(['viewers', 'working', 'asked'])} data-testid='busy' />
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

export const Examples: Story = {
  render: () => (
    <div className='p-4 w-[68rem]'>
      <ExamplesStory />
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
