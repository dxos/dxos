//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { type CSSVariables } from '../Container/index.ts';

/** A narrow reading width, so the story's pane is wider than the document. */
const READING_WIDTH: CSSVariables = { '--spacing-document-max-width': '20rem' };

const ROWS = Array.from({ length: 30 }, (_, index) => `Item ${index + 1}`);

/** A panel filling a fixed-height host: a toolbar header, 30 rows with rail icons that overflow the body, and a footer. */
const DefaultStory = ({ size = 'md' }: SizeArgs) => (
  <div data-place='full' className='h-64' data-testid={`host-${size}`}>
    <Next.Panel.Root size={size} data-testid={`panel-${size}`}>
      <Next.Panel.Header data-testid={`header-${size}`}>
        <Next.Toolbar.Root>
          <Next.Button icon='ph--plus--regular' label='Add' iconOnly data-testid={`add-${size}`} />
          <Next.Toolbar.Text>Inbox</Next.Toolbar.Text>
          <Next.Button icon='ph--dots-three-vertical--regular' label='More' iconOnly />
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body data-testid={`body-${size}`}>
        {ROWS.map((label, index) => (
          <Next.Container key={label} layout='row' data-testid={index === 0 ? `row-${size}` : undefined}>
            <Next.Block rail='start' data-testid={index === 0 ? `rail-${size}` : undefined}>
              <Next.Icon icon='ph--envelope--regular' />
            </Next.Block>
            <Next.Typography data-testid={index === 0 ? `text-${size}` : undefined}>{label}</Next.Typography>
          </Next.Container>
        ))}
      </Next.Panel.Body>
      <Next.Panel.Footer data-testid={`footer-${size}`}>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>{ROWS.length} items</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Footer>
    </Next.Panel.Root>
  </div>
);

/**
 * The default panel above one whose header is empty and which has no footer, so both rows collapse to nothing, and a
 * panel at the document width.
 */
const TestStory = (args: SizeArgs) => (
  <>
    <DefaultStory {...args} />
    <div data-place='full' className='h-16' data-testid={`bare-host-${args.size}`}>
      <Next.Panel.Root size={args.size}>
        <Next.Panel.Header data-testid={`empty-header-${args.size}`} />
        <Next.Panel.Body data-testid={`bare-body-${args.size}`}>
          <Next.Typography>Body</Next.Typography>
        </Next.Panel.Body>
      </Next.Panel.Root>
    </div>
    <div data-place='full' className='h-16' style={READING_WIDTH}>
      <Next.Panel.Root size={args.size} width='document' data-testid={`reading-${args.size}`}>
        <Next.Panel.Body>
          <Next.Typography data-testid={`reading-text-${args.size}`}>Reading width</Next.Typography>
        </Next.Panel.Body>
      </Next.Panel.Root>
    </div>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Panel',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * At every size the panel fills its host and stacks a header and footer sized to their one-row toolbars (one block) and
 * the growing body with no gaps, while an empty header and a missing footer take no space; its `data-size` reaches the
 * toolbar's controls and the body's rail Blocks. The body overflows and scrolls with the thin overlay thumb in the end
 * gutter. Narrowed below the collapse width, the panel (the query container) collapses the body's rail gutter to the
 * inset and hides the rail Blocks.
 */
export const Test: Story = {
  render: TestStory,
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    // `width='document'` keeps the body's content at the reading width, centred in the panel.
    const reading = byTestId(canvasElement, 'reading-md').getBoundingClientRect();
    const readingText = byTestId(canvasElement, 'reading-text-md').getBoundingClientRect();
    await expect(readingText.width).toBeCloseTo(320 - 2 * GEOMETRY.md.block, 0);
    await expect(readingText.left - reading.left).toBeCloseTo(reading.right - readingText.right, 0);

    for (const size of SIZES) {
      const { block, inset } = GEOMETRY[size];
      const panel = byTestId(canvasElement, `panel-${size}`);
      const host = byTestId(canvasElement, `host-${size}`).getBoundingClientRect();
      const rect = panel.getBoundingClientRect();
      const header = byTestId(canvasElement, `header-${size}`).getBoundingClientRect();
      const body = byTestId(canvasElement, `body-${size}`).getBoundingClientRect();
      const footer = byTestId(canvasElement, `footer-${size}`).getBoundingClientRect();
      await expect(panel).toHaveAttribute('data-size', size);
      await expect(getComputedStyle(panel).containerType, `${size} query container`).toBe('inline-size');

      // Fills the host; the parts stack edge to edge.
      await expect(rect.height, `${size} fills height`).toBeCloseTo(host.height, 0);
      await expect(rect.width, `${size} fills width`).toBeCloseTo(host.width, 0);
      await expect(header.top, `${size} header top`).toBeCloseTo(rect.top, 0);
      await expect(header.height, `${size} toolbar header height`).toBeCloseTo(block, 0);
      await expect(body.top, `${size} body top`).toBeCloseTo(header.bottom, 0);
      await expect(footer.top, `${size} footer top`).toBeCloseTo(body.bottom, 0);
      await expect(footer.bottom, `${size} footer bottom`).toBeCloseTo(rect.bottom, 0);
      await expect(footer.height, `${size} toolbar footer height`).toBeCloseTo(block, 0);

      // An empty header and a missing footer take no space: the body fills the panel.
      const bareHost = byTestId(canvasElement, `bare-host-${size}`).getBoundingClientRect();
      const emptyHeader = byTestId(canvasElement, `empty-header-${size}`).getBoundingClientRect();
      const bareBody = byTestId(canvasElement, `bare-body-${size}`).getBoundingClientRect();
      await expect(emptyHeader.height, `${size} empty header height`).toBe(0);
      await expect(bareBody.top, `${size} bare body top`).toBeCloseTo(bareHost.top, 0);
      await expect(bareBody.bottom, `${size} bare body bottom`).toBeCloseTo(bareHost.bottom, 0);

      // Size flows to the toolbar's controls and the body's rails.
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

    // The body scrolls, the thumb in the end gutter following it.
    const frame = byTestId(canvasElement, 'body-md');
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
