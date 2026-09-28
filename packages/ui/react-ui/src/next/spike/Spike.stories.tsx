//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode } from 'react';
import { expect } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../testing/index.ts';
import { Next } from '../components.tsx';
import { type Size } from '../sizes.ts';
import { Block, Container, ScrollArea, SpikeStyles } from './Spike.tsx';

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

random.seed(123);

const LOREM = random.lorem.paragraph();
const PARAGRAPHS = Array.from({ length: 12 }, () => random.lorem.paragraph());
const MESSAGE = random.lorem.paragraphs(2);

const Icon = ({ icon = 'ph--circle--regular' }: { icon?: string }) => <Next.Icon icon={icon} />;

const Field = ({ id, label, testId }: { id: string; label: string; testId?: string }) => (
  <Container layout='row' data-testid={testId}>
    <Block rail='start' data-testid={testId && `${testId}-rail-start`}>
      <Icon />
    </Block>
    <label htmlFor={id} className='pe-(--nx-gap-size)' data-testid={testId && `${testId}-label`}>
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

/** A stack row: the icon sits in the start rail beside the first line while the text wraps in the content track. */
const Message = ({ testId, children }: { testId: string; children: ReactNode }) => (
  <Container data-testid={testId}>
    <Block rail='start' data-testid={`${testId}-rail-start`}>
      <Icon icon='ph--chat-circle--regular' />
    </Block>
    {/* Pads the line box up to the block so the first line centres on the icon. */}
    <p className='py-[calc((var(--nx-block-size)-var(--nx-line-height))/2)]' data-testid={`${testId}-text`}>
      {children}
    </p>
  </Container>
);

/** Scroll body content: sections, rows, a full-bleed band, a nested form and a nested scroll. */
const Body = () => (
  <>
    <Container>
      <h2 className='font-medium'>Section</h2>
      <p data-testid='paragraph'>{LOREM}</p>
    </Container>
    <Field id='a' label='Name' testId='row-a' />
    <Field id='b' label='Email' />
    <Message testId='message'>{MESSAGE}</Message>
    <div data-place='full' className='h-4 bg-accent-bg' data-testid='full-bleed' />
    <Container data-testid='nested'>
      <h2 className='font-medium'>Nested form</h2>
      <Field id='c' label='A much longer label' testId='row-nested' />
      <Field id='d' label='City' />
    </Container>
    <ScrollArea.Root classNames='h-40 border-y border-separator'>
      <ScrollArea.Viewport asChild>
        <Container data-testid='inner-scroll'>
          {Array.from({ length: 8 }, (_, index) => (
            <Field
              key={index}
              id={`s${index}`}
              label={`Item ${index}`}
              testId={index === 0 ? 'row-inner' : undefined}
            />
          ))}
        </Container>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
    {PARAGRAPHS.map((paragraph, index) => (
      <p key={index}>{paragraph}</p>
    ))}
  </>
);

type StoryArgs = {
  size: Size;
  width: string;
  native: boolean;
  debug: boolean;
};

const DefaultStory = ({ size, width, native, debug }: StoryArgs) => (
  <>
    <SpikeStyles />
    <div
      data-size={size}
      data-debug={debug ? '' : undefined}
      className='nx-scope @container flex flex-col h-[40rem] border border-separator bg-base-surface'
      style={{ width }}
    >
      <Header testId='header'>Header</Header>
      <ScrollArea.Root native={native} classNames='flex-1'>
        <ScrollArea.Viewport asChild>
          <Container gutter='rail' columns={LABEL_COLUMNS} data-testid='body'>
            <Body />
          </Container>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
      <Header testId='footer'>Footer</Header>
    </div>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/spike',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
  args: { size: 'md', width: '40rem', native: false, debug: false },
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
  // Wrapped text keeps to the content track, with the icon in the rail beside its first line.
  const text = rect(root, 'message-text');
  await expect(rect(root, 'message-rail-start').left).toBeCloseTo(header.left, 0);
  await expect(text.left).toBeCloseTo(rect(root, 'header-content').left, 0);
  await expect(text.right).toBeCloseTo(rect(root, 'header-content').right, 0);
  await expect(text.height).toBeGreaterThan(rect(root, 'message-rail-start').height * 2);
  const icon = rect(root, 'message-rail-start');
  const textStyle = getComputedStyle(root.querySelector('[data-testid="message-text"]') ?? root);
  const firstLine = text.top + parseFloat(textStyle.paddingTop) + parseFloat(textStyle.lineHeight) / 2;
  await expect(icon.top + icon.height / 2).toBeCloseTo(firstLine, 0);
  const body = root.querySelector<HTMLElement>('[data-testid="body"]');
  await expect(body && body.scrollHeight > body.clientHeight).toBe(true);
};

export const Default: Story = {
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
