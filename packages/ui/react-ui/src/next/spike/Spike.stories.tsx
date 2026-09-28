//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode } from 'react';
import { expect } from 'storybook/test';

import { withTheme } from '../../testing/index.ts';
import { Next } from '../components.tsx';
import { type Size } from '../sizes.ts';
import { Block, Container, ScrollArea, SpikeStyles } from './Spike.tsx';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const Icon = ({ icon = 'ph--circle--regular' }: { icon?: string }) => <Next.Icon icon={icon} />;

const Field = ({ id, label, testId }: { id: string; label: string; testId?: string }) => (
  <Container layout='row' data-testid={testId}>
    <Block rail='start' data-testid={testId && `${testId}-rail-start`}>
      <Icon />
    </Block>
    <label htmlFor={id} className='pe-(--gap-size)' data-testid={testId && `${testId}-label`}>
      {label}
    </label>
    <Next.Input id={id} data-testid={testId && `${testId}-input`} />
    <Block rail='end' data-testid={testId && `${testId}-rail-end`}>
      <Icon icon='ph--x--regular' />
    </Block>
  </Container>
);

const Header = ({ testId, children }: { testId: string; children: ReactNode }) => (
  <Container gutter='rail' layout='row' data-testid={testId}>
    <Block rail='start' data-testid={`${testId}-rail-start`}>
      <Icon icon='ph--list--regular' />
    </Block>
    <div className='truncate' data-testid={`${testId}-content`}>
      {children}
    </div>
    <Block rail='end' data-testid={`${testId}-rail-end`}>
      <Icon icon='ph--dots-three-vertical--regular' />
    </Block>
  </Container>
);

/** Content shared by both API shapes: sections, rows, a full-bleed band, a nested form and a nested scroll. */
const Body = () => (
  <>
    <Container>
      <h2 className='font-medium'>Section</h2>
      <p data-testid='paragraph'>{LOREM}</p>
    </Container>
    <Field id='a' label='Name' testId='row-a' />
    <Field id='b' label='Email' />
    <div data-place='full' className='h-4 bg-accent-surface' data-testid='full-bleed' />
    <Container data-testid='nested'>
      <h2 className='font-medium'>Nested form</h2>
      <Field id='c' label='A much longer label' testId='row-nested' />
      <Field id='d' label='City' />
    </Container>
    <Container scroll data-testid='inner-scroll' classNames='h-40 border-y border-separator'>
      {Array.from({ length: 8 }, (_, index) => (
        <Field key={index} id={`s${index}`} label={`Item ${index}`} testId={index === 0 ? 'row-inner' : undefined} />
      ))}
    </Container>
    {Array.from({ length: 12 }, (_, index) => (
      <p key={index}>{LOREM}</p>
    ))}
  </>
);

type StoryArgs = {
  size: Size;
  width: string;
  native: boolean;
  /** `internal`: Container composes ScrollArea (`scroll` prop); `composed`: caller wraps via `asChild`. */
  api: 'internal' | 'composed';
  debug: boolean;
};

const DefaultStory = ({ size, width, native, api, debug }: StoryArgs) => (
  <>
    <SpikeStyles />
    <div
      data-size={size}
      data-debug={debug ? '' : undefined}
      className='@container flex flex-col h-[40rem] border border-separator bg-base-surface'
      style={{ width }}
    >
      <Header testId='header'>Header</Header>
      {api === 'internal' ? (
        <Container gutter='rail' columns={LABEL_COLUMNS} scroll native={native} classNames='flex-1' data-testid='body'>
          <Body />
        </Container>
      ) : (
        <ScrollArea.Root native={native} classNames='flex-1'>
          <ScrollArea.Viewport asChild>
            <Container gutter='rail' columns={LABEL_COLUMNS} data-testid='body'>
              <Body />
            </Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      )}
      <Header testId='footer'>Footer</Header>
    </div>
  </>
);

const meta = {
  title: 'ui/react-ui-core/playground/spike',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
  args: { size: 'md', width: '40rem', native: false, api: 'internal', debug: false },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const rect = (root: HTMLElement, testId: string) => {
  const element = root.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`missing ${testId}`);
  }
  return element.getBoundingClientRect();
};

/** Rails, label track and full bleed line up across the header, top-level rows, nested form and nested scroll. */
const assertAligned = async (root: HTMLElement, { railEnd = true } = {}) => {
  const header = rect(root, 'header-rail-start');
  for (const row of ['row-a', 'row-nested', 'row-inner']) {
    await expect(rect(root, `${row}-rail-start`).left).toBeCloseTo(header.left, 0);
    if (railEnd) {
      await expect(rect(root, `${row}-rail-end`).right).toBeCloseTo(rect(root, 'header-rail-end').right, 0);
    }
    // Content-sized label track is shared through subgrid: every input starts at the same x.
    await expect(rect(root, `${row}-input`).left).toBeCloseTo(rect(root, 'row-a-input').left, 0);
  }
  await expect(rect(root, 'paragraph').left).toBeCloseTo(rect(root, 'header-content').left, 0);
  // The scrollbar lives in the end gutter, so the content track ends where the header's does.
  await expect(rect(root, 'paragraph').right).toBeCloseTo(rect(root, 'header-content').right, 0);
  await expect(rect(root, 'full-bleed').left).toBeCloseTo(rect(root, 'header').left, 0);
  const body = root.querySelector<HTMLElement>('[data-testid="body"]');
  await expect(body && body.scrollHeight > body.clientHeight).toBe(true);
};

export const Internal: Story = {
  play: ({ canvasElement }) => assertAligned(canvasElement),
};

export const Composed: Story = {
  args: { api: 'composed' },
  play: ({ canvasElement }) => assertAligned(canvasElement),
};

export const Native: Story = {
  args: { native: true },
  // A native bar takes its width out of the end gutter, so rail-end icons cannot also align.
  play: ({ canvasElement }) => assertAligned(canvasElement, { railEnd: false }),
};

export const Narrow: Story = {
  args: { width: '20rem' },
  play: async ({ canvasElement }) => {
    // Rails collapse to the inset and the label stacks above its input.
    await expect(rect(canvasElement, 'row-a-rail-start').width).toBe(0);
    await expect(rect(canvasElement, 'row-a-input').top).toBeGreaterThan(rect(canvasElement, 'row-a-label').top);
    await expect(rect(canvasElement, 'row-a-input').left).toBeCloseTo(rect(canvasElement, 'row-a-label').left, 0);
  },
};

export const Sizes: Story = {
  args: { size: 'lg' },
  play: ({ canvasElement }) => assertAligned(canvasElement),
};
