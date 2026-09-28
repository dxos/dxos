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
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, expectScoped } from '../../testing.ts';
import { type ScrollAreaRootProps } from './ScrollArea.tsx';

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

type PaneProps = Pick<ScrollAreaRootProps, 'mode' | 'width' | 'native'> & { prefix: string };

/** A header over a scroll pane whose rows share its rails; `prefix` keeps test ids unique. */
const Pane = ({ prefix, mode, width, native }: PaneProps) => (
  <div className='@container flex flex-col h-[14rem] w-[26rem] border border-separator bg-base-surface'>
    <Header testId={`${prefix}-header`}>Header</Header>
    <Next.ScrollArea.Root mode={mode} width={width} native={native} classNames='flex-1' data-testid={`${prefix}-root`}>
      <Next.ScrollArea.Viewport asChild>
        <Next.Container gutter='rail' data-testid={`${prefix}-viewport`}>
          <Next.Container layout='row'>
            <Next.Block rail='start' data-testid={`${prefix}-row-rail-start`}>
              <Next.Icon icon='ph--user--regular' />
            </Next.Block>
            <Next.Input aria-label='Name' />
            <Next.Block rail='end' data-testid={`${prefix}-row-rail-end`}>
              <Next.Icon icon='ph--x--regular' />
            </Next.Block>
          </Next.Container>
          {PARAGRAPHS.map((paragraph, index) => (
            <Next.Typography key={index} data-testid={index === 0 ? `${prefix}-paragraph` : undefined}>
              {paragraph}
            </Next.Typography>
          ))}
        </Next.Container>
      </Next.ScrollArea.Viewport>
    </Next.ScrollArea.Root>
  </div>
);

type StoryArgs = SizeArgs & Pick<ScrollAreaRootProps, 'mode' | 'width'>;

/** An overlay (or `mode`/`width`) pane beside a native one. */
const DefaultStory = ({ size, mode, width }: StoryArgs) => (
  <div className='flex gap-2'>
    <Pane prefix={`overlay-${size}`} mode={mode} width={width} />
    <Pane prefix={`native-${size}`} native />
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/scroll-area',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[56rem]' }), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const rect = (root: HTMLElement, testId: string) => byTestId(root, testId).getBoundingClientRect();

/** Rows in the scroll pane share the header's rails, and the content track ends where the header's does. */
const assertAligned = async (root: HTMLElement, prefix: string, { railEnd = true } = {}) => {
  const at = (testId: string) => rect(root, `${prefix}-${testId}`);
  await expect(at('row-rail-start').left).toBeCloseTo(at('header-rail-start').left, 0);
  if (railEnd) {
    await expect(at('row-rail-end').right).toBeCloseTo(at('header-rail-end').right, 0);
    await expect(at('paragraph').right).toBeCloseTo(at('header-content').right, 0);
  }
  await expect(at('paragraph').left).toBeCloseTo(at('header-content').left, 0);
  const viewport = byTestId(root, `${prefix}-viewport`);
  await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
};

export const Default: Story = {};

/**
 * Overlay thumbs sit in the end gutter, so the content track is not narrowed, and the thumb follows the scroll; a
 * native bar reserves its width out of the end track, so rail-end Blocks cannot also align (finding 4).
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    await assertAligned(canvasElement, 'overlay-md');
    const viewport = byTestId(canvasElement, 'overlay-md-viewport');
    const root = byTestId(canvasElement, 'overlay-md-root');
    await expect(viewport).toHaveClass('nx-scroll-viewport');
    await expect(root).toHaveAttribute('data-mode', 'overlay');
    await expect(getComputedStyle(viewport).scrollbarWidth).toBe('none');

    const thumb = await waitFor(() => {
      const element = root.querySelector<HTMLElement>(':scope > .absolute');
      if (!element) {
        throw new Error('missing thumb');
      }
      return element;
    });
    const top = thumb.getBoundingClientRect().top;
    viewport.scrollTop = viewport.scrollHeight;
    await waitFor(() => expect(thumb.getBoundingClientRect().top).toBeGreaterThan(top));
    await expect(thumb.getBoundingClientRect().right).toBeCloseTo(root.getBoundingClientRect().right, 0);
    await expectScoped(canvasElement);

    await assertAligned(canvasElement, 'native-md', { railEnd: false });
    await expect(byTestId(canvasElement, 'native-md-root')).toHaveAttribute('data-mode', 'reserve');
    await expect(byTestId(canvasElement, 'native-md-viewport')).toHaveAttribute('data-native');
    await expect(byTestId(canvasElement, 'native-md-root').querySelector(':scope > .absolute')).toBeNull();
  },
};
