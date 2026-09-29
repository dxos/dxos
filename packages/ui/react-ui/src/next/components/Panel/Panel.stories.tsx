//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';

const ROWS = Array.from({ length: 30 }, (_, index) => `Item ${index + 1}`);

/** A panel filling a fixed-height host: a toolbar, 30 rows with rail icons that overflow the content, and a statusbar. */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <div data-place='full' className='h-64' data-testid={`host-${size}`}>
    <Next.Panel.Root size={size} data-testid={`panel-${size}`}>
      <Next.Panel.Toolbar data-testid={`toolbar-${size}`}>
        <Next.Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
        <Next.Toolbar.Text>Inbox</Next.Toolbar.Text>
        <Next.Button icon='ph--dots-three-vertical--regular' label='More' iconOnly />
      </Next.Panel.Toolbar>
      <Next.Panel.Content data-testid={`content-${size}`}>
        {ROWS.map((label, index) => (
          <Next.Container key={label} layout='row' data-testid={index === 0 ? `row-${size}` : undefined}>
            <Next.Block rail='start' data-testid={index === 0 ? `rail-${size}` : undefined}>
              <Next.Icon icon='ph--envelope--regular' />
            </Next.Block>
            <Next.Typography data-testid={index === 0 ? `text-${size}` : undefined}>{label}</Next.Typography>
          </Next.Container>
        ))}
      </Next.Panel.Content>
      <Next.Panel.Statusbar data-testid={`statusbar-${size}`}>{ROWS.length} items</Next.Panel.Statusbar>
    </Next.Panel.Root>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Panel',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * At every size the panel fills its host and stacks a block-tall toolbar, the growing content and a block-tall
 * statusbar with no gaps; its `data-size` reaches the toolbar's controls and the content's rail Blocks. The content
 * overflows and scrolls with the thin overlay thumb in the end gutter. Narrowed below the collapse width, the panel (the
 * query container) collapses the content's rail gutter to the inset and hides the rail Blocks.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const { block, inset } = GEOMETRY[size];
      const panel = byTestId(canvasElement, `panel-${size}`);
      const host = byTestId(canvasElement, `host-${size}`).getBoundingClientRect();
      const rect = panel.getBoundingClientRect();
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      const content = byTestId(canvasElement, `content-${size}`).getBoundingClientRect();
      const statusbar = byTestId(canvasElement, `statusbar-${size}`).getBoundingClientRect();
      await expect(panel).toHaveAttribute('data-size', size);
      await expect(getComputedStyle(panel).containerType, `${size} query container`).toBe('inline-size');

      // Fills the host; the parts stack edge to edge.
      await expect(rect.height, `${size} fills height`).toBeCloseTo(host.height, 0);
      await expect(rect.width, `${size} fills width`).toBeCloseTo(host.width, 0);
      await expect(toolbar.top, `${size} toolbar top`).toBeCloseTo(rect.top, 0);
      await expect(toolbar.height, `${size} toolbar height`).toBeCloseTo(block, 0);
      await expect(content.top, `${size} content top`).toBeCloseTo(toolbar.bottom, 0);
      await expect(statusbar.top, `${size} statusbar top`).toBeCloseTo(content.bottom, 0);
      await expect(statusbar.bottom, `${size} statusbar bottom`).toBeCloseTo(rect.bottom, 0);
      await expect(statusbar.height, `${size} statusbar height`).toBeCloseTo(block, 0);

      // Size flows to the toolbar's controls and the content's rails.
      const add = byTestId(canvasElement, `add-${size}`).getBoundingClientRect();
      await expect(add.height, `${size} control`).toBeCloseTo(controlSize(size), 0);
      await expect(add.left - rect.left, `${size} control inset`).toBeCloseTo(inset, 0);
      const rail = byTestId(canvasElement, `rail-${size}`).getBoundingClientRect();
      await expect(rail.width, `${size} rail block`).toBeCloseTo(block, 0);
      await expect(rail.left, `${size} rail start`).toBeCloseTo(rect.left, 0);
      await expect(byTestId(canvasElement, `text-${size}`).getBoundingClientRect().left).toBeCloseTo(rail.right, 0);
      await expect(byTestId(canvasElement, `row-${size}`).getBoundingClientRect().height).toBeCloseTo(block, 0);
    }
    await expectScoped(canvasElement);

    // The content scrolls, the thumb in the end gutter following it.
    const frame = byTestId(canvasElement, 'content-md');
    const viewport = frame.querySelector<HTMLElement>(':scope > .nx-scroll-viewport');
    await expect(viewport).not.toBeNull();
    if (!viewport) {
      return;
    }
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    await expect(getComputedStyle(viewport).scrollbarWidth).toBe('none');
    const thumb = await waitFor(() => {
      const element = frame.querySelector<HTMLElement>(':scope > .absolute');
      if (!element) {
        throw new Error('missing thumb');
      }
      return element;
    });
    const top = thumb.getBoundingClientRect().top;
    viewport.scrollTop = viewport.scrollHeight;
    await waitFor(() => expect(thumb.getBoundingClientRect().top).toBeGreaterThan(top));
    const thumbRect = thumb.getBoundingClientRect();
    await expect(thumbRect.right).toBeCloseTo(frame.getBoundingClientRect().right, 0);
    await expect(thumbRect.left, 'thumb in the end gutter').toBeGreaterThanOrEqual(
      frame.getBoundingClientRect().right - GEOMETRY.md.block,
    );

    // Narrowed below the collapse width, the panel collapses the rail gutter to the inset and hides the rails.
    const host = byTestId(canvasElement, 'host-md');
    host.style.width = '16rem';
    try {
      const panel = byTestId(canvasElement, 'panel-md');
      await waitFor(() => expect(getComputedStyle(byTestId(canvasElement, 'rail-md')).display).toBe('none'));
      const text = byTestId(sizeRow(canvasElement, 'md'), 'text-md').getBoundingClientRect();
      await expect(text.left - panel.getBoundingClientRect().left, 'inset gutter').toBeCloseTo(8, 0);
    } finally {
      host.style.width = '';
    }
  },
};
