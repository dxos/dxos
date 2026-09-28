//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { byTestId, expectScoped } from '../../testing.ts';

random.seed(123);

const PARAGRAPHS = Array.from({ length: 12 }, () => random.lorem.paragraph());

const Header = ({ testId, children }: { testId: string; children: string }) => (
  <Next.Container gutter='rail' layout='row' data-testid={testId}>
    <Next.Block rail='start' data-testid={`${testId}-rail-start`}>
      <Next.Icon icon='ph--list--regular' />
    </Next.Block>
    <div className='truncate' data-testid={`${testId}-content`}>
      {children}
    </div>
    <Next.Block rail='end' data-testid={`${testId}-rail-end`}>
      <Next.Icon icon='ph--dots-three-vertical--regular' />
    </Next.Block>
  </Next.Container>
);

type StoryArgs = {
  mode?: 'overlay' | 'reserve';
  width?: 'thin' | 'regular';
  native?: boolean;
};

const DefaultStory = ({ mode, width, native }: StoryArgs) => (
  <div
    className='nx-scope @container flex flex-col h-[30rem] w-[32rem] border border-separator bg-base-surface'
    data-size='md'
  >
    <Header testId='header'>Header</Header>
    <Next.ScrollArea.Root mode={mode} width={width} native={native} classNames='flex-1' data-testid='root'>
      <Next.ScrollArea.Viewport asChild>
        <Next.Container gutter='rail' data-testid='viewport'>
          <Next.Container layout='row' data-testid='row'>
            <Next.Block rail='start' data-testid='row-rail-start'>
              <Next.Icon icon='ph--user--regular' />
            </Next.Block>
            <Next.Input aria-label='Name' />
            <Next.Block rail='end' data-testid='row-rail-end'>
              <Next.Icon icon='ph--x--regular' />
            </Next.Block>
          </Next.Container>
          {PARAGRAPHS.map((paragraph, index) => (
            <Next.Typography key={index} data-testid={index === 0 ? 'paragraph' : undefined}>
              {paragraph}
            </Next.Typography>
          ))}
        </Next.Container>
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/scroll-area',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const rect = (root: HTMLElement, testId: string) => byTestId(root, testId).getBoundingClientRect();

/** Rows in the scroll pane share the header's rails, and the content track ends where the header's does. */
const assertAligned = async (root: HTMLElement, { railEnd = true } = {}) => {
  await expect(rect(root, 'row-rail-start').left).toBeCloseTo(rect(root, 'header-rail-start').left, 0);
  if (railEnd) {
    await expect(rect(root, 'row-rail-end').right).toBeCloseTo(rect(root, 'header-rail-end').right, 0);
    await expect(rect(root, 'paragraph').right).toBeCloseTo(rect(root, 'header-content').right, 0);
  }
  await expect(rect(root, 'paragraph').left).toBeCloseTo(rect(root, 'header-content').left, 0);
  const viewport = byTestId(root, 'viewport');
  await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
};

export const Default: Story = {};

/** Overlay thumbs sit in the end gutter, so the content track is not narrowed; the thumb follows the scroll. */
export const Overlay: Story = {
  play: async ({ canvasElement }) => {
    await assertAligned(canvasElement);
    const viewport = byTestId(canvasElement, 'viewport');
    await expect(viewport).toHaveClass('nx-scroll-viewport');
    await expect(byTestId(canvasElement, 'root')).toHaveAttribute('data-mode', 'overlay');
    await expect(getComputedStyle(viewport).scrollbarWidth).toBe('none');

    const thumb = await waitFor(() => {
      const element = byTestId(canvasElement, 'root').querySelector<HTMLElement>(':scope > .absolute');
      if (!element) {
        throw new Error('missing thumb');
      }
      return element;
    });
    const top = thumb.getBoundingClientRect().top;
    viewport.scrollTop = viewport.scrollHeight;
    await waitFor(() => expect(thumb.getBoundingClientRect().top).toBeGreaterThan(top));
    await expect(thumb.getBoundingClientRect().right).toBeCloseTo(rect(canvasElement, 'root').right, 0);
    await expectScoped(canvasElement);
  },
};

/** A native bar reserves its width out of the end track, so rail-end Blocks cannot also align (finding 4). */
export const Native: Story = {
  args: { native: true },
  play: async ({ canvasElement }) => {
    await assertAligned(canvasElement, { railEnd: false });
    await expect(byTestId(canvasElement, 'root')).toHaveAttribute('data-mode', 'reserve');
    await expect(byTestId(canvasElement, 'viewport')).toHaveAttribute('data-native');
    await expect(byTestId(canvasElement, 'root').querySelector(':scope > .absolute')).toBeNull();
  },
};
