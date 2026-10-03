//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { byTestId, expectScoped, realHover } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Block, Container, Icon, Input, ScrollArea, Tag, Typography } from '../index.ts';
import { type ScrollAreaRootProps } from './ScrollArea.tsx';

random.seed(123);

const PARAGRAPHS = Array.from({ length: 12 }, () => random.lorem.paragraph());

const Header = ({ testId, children }: { testId: string; children: string }) => (
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

type PaneProps = Pick<ScrollAreaRootProps, 'mode' | 'width' | 'native'> & { prefix: string };

/** A header over a scroll pane whose rows share its rails; `prefix` keeps test ids unique. */
const Pane = ({ prefix, mode, width, native }: PaneProps) => (
  <div className='@container flex flex-col h-[14rem] w-[26rem] border border-separator bg-base-surface'>
    <Header testId={`${prefix}-header`}>Header</Header>
    <ScrollArea.Root mode={mode} width={width} native={native} classNames='flex-1' data-testid={`${prefix}-root`}>
      <ScrollArea.Viewport asChild>
        <Container gutter='rail' data-testid={`${prefix}-viewport`}>
          <Container layout='row'>
            <Block rail='start' data-testid={`${prefix}-row-rail-start`}>
              <Icon icon='ph--user--regular' />
            </Block>
            <Input aria-label='Name' />
            <Block rail='end' data-testid={`${prefix}-row-rail-end`}>
              <Icon icon='ph--x--regular' />
            </Block>
          </Container>
          {PARAGRAPHS.map((paragraph, index) => (
            <Typography key={index} data-testid={index === 0 ? `${prefix}-paragraph` : undefined}>
              {paragraph}
            </Typography>
          ))}
        </Container>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  </div>
);

type StoryArgs = SizeArgs & Pick<ScrollAreaRootProps, 'mode' | 'width'>;

const TAGS = Array.from({ length: 16 }, (_, index) => `Tag ${index + 1}`);

type StripProps = Pick<ScrollAreaRootProps, 'autoHide' | 'snap' | 'scrollbars'> & { prefix: string };

/** A horizontal strip of Tags wider than its pane. */
const Strip = ({ prefix, ...props }: StripProps) => (
  <ScrollArea.Root {...props} orientation='horizontal' classNames='w-[26rem]' data-testid={`${prefix}-root`}>
    <ScrollArea.Viewport data-testid={`${prefix}-viewport`}>
      <div className='flex w-max gap-2 py-2'>
        {TAGS.map((tag) => (
          <Tag key={tag} hue='sky' classNames='snap-start'>
            {tag}
          </Tag>
        ))}
      </div>
    </ScrollArea.Viewport>
  </ScrollArea.Root>
);

/**
 * An overlay (or `mode`/`width`) pane beside a native one, then a horizontal strip that snaps and hides its thumb
 * until hovered, and one with no scrollbar at all.
 */
const DefaultStory = ({ size, mode, width }: StoryArgs) => (
  <>
    <div className='flex gap-2'>
      <Pane prefix={`overlay-${size}`} mode={mode} width={width} />
      <Pane prefix={`native-${size}`} native />
    </div>
    <Strip prefix={`strip-${size}`} snap autoHide />
    <Strip prefix={`bare-${size}`} scrollbars={false} />
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/ScrollArea',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[56rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
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
 * native bar reserves its width out of the end track, so rail-end Blocks cannot also align (finding 4). A horizontal
 * pane scrolls sideways only, snaps when asked, and its `autoHide` thumb runs along the bottom, showing only while the
 * pointer is over it; `scrollbars={false}` shows no bar.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    await assertAligned(canvasElement, 'overlay-md');
    const viewport = byTestId(canvasElement, 'overlay-md-viewport');
    const root = byTestId(canvasElement, 'overlay-md-root');
    await expect(viewport).toHaveClass('dx-scroll-viewport');
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

    const strip = byTestId(canvasElement, 'strip-md-root');
    const stripViewport = byTestId(canvasElement, 'strip-md-viewport');
    await expect(stripViewport.scrollWidth).toBeGreaterThan(stripViewport.clientWidth);
    await expect(getComputedStyle(stripViewport).overflowY).toBe('hidden');
    await expect(getComputedStyle(stripViewport).scrollSnapType).toBe('x mandatory');
    const stripThumb = await waitFor(() => {
      const element = strip.querySelector<HTMLElement>(':scope > .absolute');
      if (!element) {
        throw new Error('missing horizontal thumb');
      }
      return element;
    });
    // Along the bottom edge, inset by the thumb's padding.
    const stripGap = strip.getBoundingClientRect().bottom - stripThumb.getBoundingClientRect().bottom;
    await expect(stripGap >= 0 && stripGap <= 4, `thumb gap ${stripGap}`).toBe(true);
    await expect(stripThumb.getBoundingClientRect().width).toBeLessThan(strip.getBoundingClientRect().width);
    await expect(getComputedStyle(stripThumb).opacity).toBe('0');
    await realHover(strip);
    await waitFor(() => expect(getComputedStyle(stripThumb).opacity).toBe('1'));

    const bare = byTestId(canvasElement, 'bare-md-root');
    await expect(bare.querySelector(':scope > .absolute')).toBeNull();
    await expect(getComputedStyle(byTestId(canvasElement, 'bare-md-viewport')).scrollbarWidth).toBe('none');
  },
};
